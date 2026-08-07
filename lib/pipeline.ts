import type {
  PipelineInput,
  PipelineResult,
  PipelineProgress,
  DesignBlueprint,
  QAIssue,
  QAStatus,
} from "@/types";
import {
  generateBlueprint,
  generateVariation,
  reviewDesignQA,
  applyQAFixes,
} from "@/lib/ai";
import { captureAndAudit, auditOnly } from "@/lib/qa-screenshot";
import { injectLucide } from "@/lib/inject-lucide";

/** Only critical defects justify paying for a second full generation. */
const MAX_ATTEMPTS = 2;

interface Candidate {
  html: string;
  score: number;
  issues: QAIssue[];
  /** QA couldn't be evaluated — the score is not trustworthy. */
  qaSkipped: boolean;
}

const blocking = (issues: QAIssue[]) =>
  issues.filter((i) => i.severity === "critical" || i.severity === "major");

const criticals = (issues: QAIssue[]) =>
  issues.filter((i) => i.severity === "critical");

/**
 * Rank candidates so a regeneration can never ship something worse than the
 * attempt it replaced: fewest criticals, then fewest blocking issues, then score.
 */
function betterOf(a: Candidate, b: Candidate): Candidate {
  const ac = criticals(a.issues).length;
  const bc = criticals(b.issues).length;
  if (ac !== bc) return ac < bc ? a : b;

  const ab = blocking(a.issues).length;
  const bb = blocking(b.issues).length;
  if (ab !== bb) return ab < bb ? a : b;

  return a.score >= b.score ? a : b;
}

/**
 * Multi-pass generation pipeline:
 * 1. Blueprint — plan layout section-by-section
 * 2. Generate — build HTML from blueprint
 * 3. QA — desktop + mobile render, deterministic DOM audit, vision review
 * 4. Fix — surgical search/replace, then re-verify (reverting if it regressed)
 * 5. Escalate — regenerate once if critical defects survive the fix pass
 *
 * Used by both /api/generate (SSE) and /api/external/generate (JSON).
 * The onProgress callback is optional — the external route skips it.
 */
export async function runGenerationPipeline(
  input: PipelineInput,
  onProgress?: (event: PipelineProgress) => void
): Promise<PipelineResult> {
  const {
    profile,
    selectedStyle,
    pageStructure,
    pageContent,
    imageUrls,
    stockImageUrls,
    stockImages,
    classifiedImages,
    customInstructions,
  } = input;

  const send = (event: PipelineProgress) => {
    if (onProgress) onProgress(event);
  };

  // ── Stage 2: Blueprint ──
  send({ stage: "blueprint", message: "Planning your layout..." });

  let blueprint: DesignBlueprint;
  try {
    blueprint = await generateBlueprint(
      profile,
      selectedStyle,
      pageStructure,
      pageContent,
      classifiedImages,
      stockImages
    );
  } catch (err) {
    console.error("[pipeline] Blueprint generation failed, will generate without blueprint:", err);
    // Re-throw API-level errors (auth, rate limit) — those shouldn't be swallowed
    if (err && typeof err === "object" && "status" in err) throw err;
    // For other errors, generate without blueprint (backward compat)
    blueprint = null as unknown as DesignBlueprint;
  }

  const build = async (extraInstructions?: string): Promise<string> => {
    const html = await generateVariation(
      profile,
      imageUrls,
      stockImageUrls,
      selectedStyle,
      pageStructure,
      pageContent,
      [customInstructions, extraInstructions].filter(Boolean).join("\n\n") || undefined,
      classifiedImages,
      stockImages,
      blueprint || undefined
    );
    return injectLucide(html);
  };

  /**
   * Render, measure, and review one candidate. Never throws — a QA failure
   * yields a candidate flagged as unevaluated rather than sinking the build.
   */
  const evaluate = async (
    html: string,
    iteration: number,
    stage: "qa-review" | "qa-verify"
  ): Promise<Candidate> => {
    try {
      send({
        stage: "qa-screenshot",
        message: "Rendering desktop and mobile...",
        iteration,
      });
      const capture = await captureAndAudit(html);

      send({ stage, message: "Checking quality...", iteration });
      const qa = await reviewDesignQA(
        {
          desktopScreenshot: capture.desktopScreenshot,
          mobileScreenshot: capture.mobileScreenshot,
          domFindings: capture.findings,
        },
        blueprint || ({} as DesignBlueprint),
        profile
      );

      return {
        html,
        score: qa.score,
        issues: qa.issues,
        // Browser checks still ran even if the reviewer died, so this is only
        // fully unevaluated when both produced nothing.
        qaSkipped: qa.reviewFailed && capture.findings.length === 0,
      };
    } catch (err) {
      console.error("[pipeline] QA evaluation failed:", err);
      return { html, score: 75, issues: [], qaSkipped: true };
    }
  };

  let qaIterations = 0;
  let best: Candidate | null = null;
  let regenerated = false;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    // ── Stage 3: HTML generation ──
    let html: string;
    try {
      if (attempt === 1) {
        send({ stage: "generating", message: "Building your redesign..." });
        html = await build();
      } else {
        send({ stage: "regenerating", message: "Rebuilding to fix layout problems..." });
        regenerated = true;
        html = await build(buildRetryInstructions(criticals(best!.issues)));
      }
    } catch (err) {
      // A failed retry falls back to the first attempt; a failed first attempt
      // has nothing to fall back to.
      console.error(`[pipeline] Generation attempt ${attempt} failed:`, err);
      if (best) break;
      throw err;
    }

    // ── Stage 4: QA ──
    qaIterations++;
    let candidate = await evaluate(html, attempt, "qa-review");

    // ── Stage 5: Fix pass ──
    const toFix = blocking(candidate.issues);
    if (toFix.length > 0 && !candidate.qaSkipped) {
      send({
        stage: "qa-fix",
        message: `Fixing ${toFix.length} issue${toFix.length === 1 ? "" : "s"}...`,
        iteration: attempt,
      });

      try {
        const fixedHtml = injectLucide(
          await applyQAFixes(candidate.html, candidate.issues, blueprint || ({} as DesignBlueprint))
        );

        if (fixedHtml !== candidate.html) {
          // Verify the fix instead of assuming it worked. On the first attempt
          // that's a full re-review; on the last attempt a deterministic
          // re-audit keeps the tail latency down.
          const verified =
            attempt < MAX_ATTEMPTS
              ? await evaluate(fixedHtml, attempt, "qa-verify")
              : await verifyDeterministically(fixedHtml, candidate, send, attempt);

          // Keep the fix only if it actually improved things.
          candidate = betterOf(candidate, verified);
        }
      } catch (err) {
        console.error("[pipeline] Fix pass failed:", err);
      }
    }

    best = best ? betterOf(best, candidate) : candidate;

    // Only unrecoverable defects are worth a second generation. Search/replace
    // patching can't rescue a structurally broken layout, but a rebuild can.
    if (criticals(best.issues).length === 0 || best.qaSkipped) break;
  }

  const result = best!;
  const remainingIssues = blocking(result.issues);

  let qaStatus: QAStatus;
  if (result.qaSkipped) qaStatus = "skipped";
  else if (remainingIssues.length > 0) qaStatus = "failed";
  else if (regenerated || qaIterations > 1) qaStatus = "fixed";
  else qaStatus = "passed";

  send({ stage: "finalizing", message: "Saving your preview..." });

  return {
    html: result.html,
    blueprint: blueprint || ({} as DesignBlueprint),
    qaIterations,
    finalScore: result.score,
    qaStatus,
    remainingIssues,
    regenerated,
  };
}

/**
 * Cheap post-fix check: re-run the browser measurements only. Vision-only
 * issues from the prior review are carried forward since they weren't re-tested.
 */
async function verifyDeterministically(
  fixedHtml: string,
  previous: Candidate,
  send: (event: PipelineProgress) => void,
  iteration: number
): Promise<Candidate> {
  send({ stage: "qa-verify", message: "Verifying fixes...", iteration });
  try {
    const findings = await auditOnly(fixedHtml);
    const measured: QAIssue[] = findings.map((f) => ({
      severity: f.severity,
      sectionId: f.viewport === "mobile" ? "global (mobile)" : "global",
      issueType: f.issueType,
      description: `[${f.viewport}] ${f.description}`,
      suggestedFix: f.suggestedFix,
      source: "measured" as const,
    }));

    // Vision findings can't be re-tested without another review, so assume they
    // persist. Measured findings are fully replaced by the fresh audit above.
    const carriedOver = previous.issues.filter((i) => i.source !== "measured");

    const issues = [...measured, ...carriedOver];
    const penalty = issues.reduce(
      (sum, i) => sum + (i.severity === "critical" ? 20 : i.severity === "major" ? 10 : 0),
      0
    );

    return {
      html: fixedHtml,
      score: Math.max(0, Math.min(previous.score + 10, 100 - penalty)),
      issues,
      qaSkipped: false,
    };
  } catch (err) {
    console.error("[pipeline] Deterministic verification failed:", err);
    // Unverified — treat as no better than what we already had.
    return { ...previous, html: fixedHtml };
  }
}

/** Turn surviving critical defects into guidance for the rebuild. */
function buildRetryInstructions(criticalIssues: QAIssue[]): string {
  const list = criticalIssues
    .map((issue, idx) => `${idx + 1}. [${issue.issueType}] ${issue.description}`)
    .join("\n");

  return `CRITICAL — the previous attempt at this page shipped with these defects. Build the page so none of them occur:

${list}

Pay particular attention to: every text colour must contrast strongly against the background actually behind it; no element may exceed the viewport width at 390px or 1280px; every section must contain real content.`;
}
