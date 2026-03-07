import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getUser } from "@/lib/auth";
import { unlockRevisions } from "@/lib/credits";
import { notifyError } from "@/lib/discord";

export async function POST(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug } = params;

    // Verify ownership
    const { data, error } = await supabaseAdmin
      .from("previews")
      .select("user_id")
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

    const result = await unlockRevisions(user.id, slug);

    if (!result.success) {
      return NextResponse.json(
        {
          error: "Insufficient credits.",
          insufficientCredits: true,
          balance: result.balance,
        },
        { status: 402 }
      );
    }

    return NextResponse.json({
      success: true,
      balance: result.balance,
      newLimit: result.newLimit,
    });
  } catch (err) {
    console.error("Unlock revisions error:", err);
    notifyError("Unlock revisions error", err);
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
