import type {
  PipelineInput,
  PipelineResult,
  PipelineProgress,
  DesignBlueprint,
} from "@/types";
import {
  generateBlueprint,
  generateVariation,
  reviewDesignQA,
  applyQAFixes,
} from "@/lib/ai";
import { screenshotHtml } from "@/lib/qa-screenshot";
import { injectLucide } from "@/lib/inject-lucide";

const MAX_QA_ITERATIONS = 3;

/**
 * Multi-pass generation pipeline:
 * 1. Blueprint — plan layout section-by-section
 * 2. Generate — build HTML from blueprint
 * 3. QA Loop — screenshot → review → fix (up to 3 iterations)
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

  // ── Stage 3: HTML Generation ──
  send({ stage: "generating", message: "Building your redesign..." });

  let html = await generateVariation(
    profile,
    imageUrls,
    stockImageUrls,
    selectedStyle,
    pageStructure,
    pageContent,
    customInstructions,
    classifiedImages,
    stockImages,
    blueprint || undefined
  );
  html = injectLucide(html);

  // ── Stage 4: QA Loop ──
  let qaIterations = 0;
  let finalScore = 75; // Default if QA is skipped
  let lastScore = -1;

  for (let i = 1; i <= MAX_QA_ITERATIONS; i++) {
    try {
      // Screenshot
      send({ stage: "qa-screenshot", message: "Taking screenshot...", iteration: i });
      const screenshot = await screenshotHtml(html);

      // Review
      send({ stage: "qa-review", message: "Reviewing design quality...", iteration: i });
      const qa = await reviewDesignQA(screenshot, blueprint || ({} as DesignBlueprint), profile);
      qaIterations = i;
      finalScore = qa.score;

      if (qa.pass) {
        break;
      }

      // Early exit if score isn't improving
      if (lastScore >= 0 && qa.score <= lastScore) {
        console.log(`[pipeline] QA score not improving (${lastScore} → ${qa.score}), stopping`);
        break;
      }
      lastScore = qa.score;

      // Fix
      const criticalAndMajor = qa.issues.filter(
        (issue) => issue.severity === "critical" || issue.severity === "major"
      );

      if (criticalAndMajor.length === 0) {
        break; // Only minor issues remain
      }

      send({ stage: "qa-fix", message: `Fixing ${criticalAndMajor.length} issues...`, iteration: i });
      html = await applyQAFixes(html, qa.issues, blueprint || ({} as DesignBlueprint));
      html = injectLucide(html);
    } catch (err) {
      console.error(`[pipeline] QA iteration ${i} failed:`, err);
      break; // Don't block on QA failures
    }
  }

  send({ stage: "finalizing", message: "Saving your preview..." });

  return {
    html,
    blueprint: blueprint || ({} as DesignBlueprint),
    qaIterations,
    finalScore,
  };
}
