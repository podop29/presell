import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { supabaseAdmin as supabase } from "@/lib/supabase/admin";
import { generateColdEmail } from "@/lib/ai";
import { runGenerationPipeline } from "@/lib/pipeline";
import { rateLimit, getIP } from "@/lib/rate-limit";
import { getUser } from "@/lib/auth";
import { getCreditStatus, deductCredit } from "@/lib/credits";
import type { GenerateRequest, PipelineProgress } from "@/types";
import { notifyError, notifySuccess } from "@/lib/discord";
import { trackEvent } from "@/lib/analytics";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  // ── Pre-checks (return JSON errors, not SSE) ──
  const user = await getUser();
  if (!user) {
    return NextResponse.json(
      { error: "You must be signed in to generate a preview." },
      { status: 401 }
    );
  }

  const ip = getIP(req.headers);

  const { balance, bonusBlocked } = await getCreditStatus(user.id, ip);
  if (balance < 1) {
    return NextResponse.json(
      {
        error: bonusBlocked
          ? "Free starter credits have already been claimed on this network."
          : "You don't have enough credits.",
        insufficientCredits: true,
        bonusBlocked,
        balance: 0,
      },
      { status: 402 }
    );
  }

  const limit = await rateLimit(`generate:${ip}`, { maxRequests: 10, windowMs: 10 * 60 * 1000 });
  if (!limit.success) {
    return NextResponse.json(
      { error: `Too many requests. Please try again in ${limit.retryAfter} seconds.` },
      { status: 429 }
    );
  }

  let body: GenerateRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const {
    url,
    devName,
    devEmail,
    devMessage,
    profile,
    selectedStyle,
    pageStructure,
    imageUrls,
    stockImageUrls,
    pageContent,
    customInstructions,
    classifiedImages,
    stockImages,
  } = body;

  try {
    new URL(url);
  } catch {
    return NextResponse.json({ error: "Invalid URL provided." }, { status: 400 });
  }

  if (!profile || !selectedStyle || !pageStructure) {
    return NextResponse.json(
      { error: "Missing analysis data. Please analyze the site first." },
      { status: 400 }
    );
  }

  // ── SSE Stream ──
  const encoder = new TextEncoder();
  let isClosed = false;
  const stream = new ReadableStream({
    async start(controller) {
      function sendEvent(data: Record<string, unknown>) {
        if (isClosed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          isClosed = true;
        }
      }

      try {
        // Run the multi-pass pipeline
        const result = await runGenerationPipeline(
          {
            profile,
            selectedStyle,
            pageStructure,
            pageContent: pageContent || "",
            imageUrls: imageUrls || [],
            stockImageUrls: stockImageUrls || [],
            stockImages,
            classifiedImages,
            customInstructions,
          },
          (progress: PipelineProgress) => {
            sendEvent({ type: "progress", ...progress });
          }
        );

        // Bail out if the client disconnected while the pipeline was running.
        // We've already paid the AI cost, but persisting + deducting + notifying
        // for a result the user will never see causes duplicate previews when
        // they retry.
        if (req.signal.aborted || isClosed) {
          console.log("[generate] client disconnected mid-pipeline, skipping persistence");
          return;
        }

        // Save to Supabase
        const slug = nanoid(8);
        const now = new Date();
        const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
        const previewBaseUrl = process.env.NEXT_PUBLIC_PREVIEW_URL || baseUrl;
        const previewUrl = `${previewBaseUrl}/preview/${slug}`;

        // Generate cold email (non-blocking)
        let coldEmail = { subject: "", body: "" };
        try {
          const mapsPattern = /google\.com\/maps|maps\.google\.|maps\.app\.goo\.gl|goo\.gl\/maps/i;
          const isNewSite = mapsPattern.test(url);
          coldEmail = await generateColdEmail(profile, previewUrl, devName || "", isNewSite);
        } catch (emailErr) {
          console.error("Cold email generation error:", emailErr);
        }

        const { error: dbError } = await supabase.from("previews").insert({
          slug,
          original_url: url,
          redesign_html: result.html,
          dev_name: devName || "",
          dev_email: devEmail || "",
          dev_message: devMessage || null,
          created_at: now.toISOString(),
          expires_at: expiresAt.toISOString(),
          variation_a_style: selectedStyle.styleName,
          user_id: user.id,
          cold_email_subject: coldEmail.subject || null,
          cold_email_body: coldEmail.body || null,
          business_name: profile.businessName || null,
          profile_json: JSON.stringify(profile),
          page_content: pageContent || null,
        });

        if (dbError) {
          console.error("Supabase insert error:", dbError.message, dbError.details, dbError.hint);
          notifyError("DB insert error", new Error(dbError.message), { details: dbError.details || "", hint: dbError.hint || "" });
          sendEvent({ type: "error", error: "Failed to save preview." });
          return;
        }

        // Deduct credit AFTER successful DB insert
        await deductCredit(user.id, 1, "generation", `Generated preview for ${url}`, slug);

        notifySuccess("Preview generated", { url, slug, email: devEmail || "", previewUrl, qaIterations: String(result.qaIterations), qaScore: String(result.finalScore) });

        trackEvent("generation_completed", { url, slug, style: selectedStyle?.styleName, qaIterations: String(result.qaIterations), qaScore: String(result.finalScore) }, {
          userId: user.id, ip, userAgent: req.headers.get("user-agent") || undefined,
        });

        sendEvent({ type: "complete", slug, previewUrl });
      } catch (err) {
        console.error("Generate pipeline error:", err);
        notifyError("Generate pipeline error", err);
        sendEvent({ type: "error", error: "An unexpected error occurred during generation." });
      } finally {
        if (!isClosed) {
          isClosed = true;
          try { controller.close(); } catch {}
        }
      }
    },
    cancel() {
      isClosed = true;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
