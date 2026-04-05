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

/**
 * Multi-pass generation pipeline:
 * 1. Blueprint — plan layout section-by-section
 * 2. Generate — build HTML from blueprint
 * 3. QA — single screenshot → review → fix pass (no re-review loop to save time)
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

  // ── Stage 4: Single QA pass (screenshot → review → fix if needed) ──
  let qaIterations = 0;
  let finalScore = 75; // Default if QA is skipped

  try {
    send({ stage: "qa-screenshot", message: "Reviewing design...", iteration: 1 });
    const screenshot = await screenshotHtml(html);

    send({ stage: "qa-review", message: "Checking quality...", iteration: 1 });
    const qa = await reviewDesignQA(screenshot, blueprint || ({} as DesignBlueprint), profile);
    qaIterations = 1;
    finalScore = qa.score;

    if (!qa.pass) {
      const criticalAndMajor = qa.issues.filter(
        (issue) => issue.severity === "critical" || issue.severity === "major"
      );

      if (criticalAndMajor.length > 0) {
        send({ stage: "qa-fix", message: `Fixing ${criticalAndMajor.length} issues...`, iteration: 1 });
        html = await applyQAFixes(html, qa.issues, blueprint || ({} as DesignBlueprint));
        html = injectLucide(html);
      }
    }
  } catch (err) {
    console.error("[pipeline] QA pass failed:", err);
    // Don't block on QA failures — ship what we have
  }

  send({ stage: "finalizing", message: "Saving your preview..." });

  return {
    html,
    blueprint: blueprint || ({} as DesignBlueprint),
    qaIterations,
    finalScore,
  };
}
