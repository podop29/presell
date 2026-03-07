import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase/admin";
import { getUser } from "@/lib/auth";
import { incrementRevisionCount } from "@/lib/credits";
import { notifyError } from "@/lib/discord";

const MAX_HTML_SIZE = 5 * 1024 * 1024; // 5 MB

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
    const user = await getUser();
    if (!user) {
      return NextResponse.json(
        { error: "You must be signed in." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { variationKey, html, isManualEdit } = body as {
      variationKey: string;
      html: string;
      isManualEdit?: boolean;
    };

    const column = VARIATION_COLUMNS[variationKey];
    if (!column) {
      return NextResponse.json(
        { error: "Invalid variation key." },
        { status: 400 }
      );
    }

    if (!html || typeof html !== "string") {
      return NextResponse.json(
        { error: "HTML content is required." },
        { status: 400 }
      );
    }

    if (new Blob([html]).size > MAX_HTML_SIZE) {
      return NextResponse.json(
        { error: "HTML content is too large (max 5 MB)." },
        { status: 400 }
      );
    }

    const { slug } = params;
    const { data, error } = await supabase
      .from("previews")
      .select("user_id, expires_at")
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
        { error: "You do not have permission to modify this preview." },
        { status: 403 }
      );
    }

    if (new Date(data.expires_at) < new Date()) {
      return NextResponse.json(
        { error: "This preview has expired." },
        { status: 410 }
      );
    }

    const { error: updateError } = await supabase
      .from("previews")
      .update({ [column]: html })
      .eq("slug", slug);

    if (updateError) {
      console.error("Supabase update error:", updateError.message);
      notifyError("Accept revision DB error", new Error(updateError.message), { slug: params.slug });
      return NextResponse.json(
        { error: "Failed to save revision." },
        { status: 500 }
      );
    }

    // Only increment revision count for AI revisions, not manual text edits
    if (!isManualEdit) {
      await incrementRevisionCount(slug);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Accept revision error:", err);
    notifyError("Accept revision error", err);
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
