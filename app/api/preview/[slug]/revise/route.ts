import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase/admin";
import { reviseVariation } from "@/lib/ai";
import { rateLimit, getIP } from "@/lib/rate-limit";
import { getUser } from "@/lib/auth";
import { injectLucide } from "@/lib/inject-lucide";
import { getRevisionInfo } from "@/lib/credits";

export const maxDuration = 300;

const VARIATION_COLUMNS: Record<string, string> = {
  redesign: "redesign_html",
  a: "variation_a_html",
  b: "variation_b_html",
  c: "variation_c_html",
};

export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    // Auth check
    const user = await getUser();
    if (!user) {
      return NextResponse.json(
        { error: "You must be signed in to revise a preview." },
        { status: 401 }
      );
    }

    // Rate limit: 10 revisions per 10 minutes per IP
    const ip = getIP(req.headers);
    const limit = rateLimit(`revise:${ip}`, {
      maxRequests: 10,
      windowMs: 10 * 60 * 1000,
    });
    if (!limit.success) {
      return NextResponse.json(
        {
          error: `Too many requests. Please try again in ${limit.retryAfter} seconds.`,
        },
        { status: 429 }
      );
    }

    // Parse and validate body
    const body = await req.json();
    const { variationKey, prompt } = body as {
      variationKey: string;
      prompt: string;
    };

    if (!variationKey || variationKey === "original") {
      return NextResponse.json(
        { error: "Cannot revise the original website." },
        { status: 400 }
      );
    }

    const column = VARIATION_COLUMNS[variationKey];
    if (!column) {
      return NextResponse.json(
        { error: "Invalid variation key." },
        { status: 400 }
      );
    }

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return NextResponse.json(
        { error: "A revision prompt is required." },
        { status: 400 }
      );
    }

    if (prompt.length > 2000) {
      return NextResponse.json(
        { error: "Prompt must be 2000 characters or fewer." },
        { status: 400 }
      );
    }

    // Fetch preview and verify ownership
    const { slug } = params;
    const { data, error } = await supabase
      .from("previews")
      .select(
        "redesign_html, variation_a_html, variation_b_html, variation_c_html, user_id, expires_at"
      )
      .eq("slug", slug)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "Preview not found." },
        { status: 404 }
      );
    }

    if (data.user_id !== user.id) {
      return NextResponse.json(
        { error: "You do not have permission to revise this preview." },
        { status: 403 }
      );
    }

    if (new Date(data.expires_at) < new Date()) {
      return NextResponse.json(
        { error: "This preview has expired." },
        { status: 410 }
      );
    }

    // Check revision limit
    const revisionInfo = await getRevisionInfo(slug);
    if (!revisionInfo.canRevise) {
      return NextResponse.json(
        {
          error: "Revision limit reached. Unlock more revisions to continue.",
          revisionLimitReached: true,
          ...revisionInfo,
        },
        { status: 402 }
      );
    }

    const existingHtml = data[column as keyof typeof data] as string | null;
    if (!existingHtml) {
      return NextResponse.json(
        { error: "This variation has no HTML to revise." },
        { status: 404 }
      );
    }

    // Call AI to revise
    let revisedHtml: string;
    try {
      revisedHtml = await reviseVariation(existingHtml, prompt.trim());
    } catch (aiErr) {
      console.error("AI revision error:", aiErr);
      const message =
        aiErr instanceof Error && aiErr.message.includes("matched")
          ? "The revision couldn't be applied — try rephrasing your request."
          : "Revision failed. Please try again.";
      return NextResponse.json({ error: message }, { status: 502 });
    }

    // Return revised HTML for preview (not saved yet) with revision info
    const updatedRevisionInfo = await getRevisionInfo(slug);
    return NextResponse.json({
      success: true,
      revisedHtml: injectLucide(revisedHtml),
      revisionInfo: updatedRevisionInfo,
    });
  } catch (err) {
    console.error("Revise error:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
