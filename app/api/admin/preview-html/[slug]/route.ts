import { NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase/admin";
import { getUser } from "@/lib/auth";
import { injectLucide } from "@/lib/inject-lucide";

export const dynamic = "force-dynamic";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map((e) => e.trim())
  .filter(Boolean);

/**
 * Admin-only: returns a preview's redesign HTML WITHOUT the expiry check, so
 * the example picker can render thumbnails for expired previews too. Never
 * linked publicly — used only by /admin/examples.
 */
export async function GET(
  _req: Request,
  { params }: { params: { slug: string } }
) {
  const user = await getUser();
  if (!user || !ADMIN_EMAILS.includes(user.email || "")) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const { data, error } = await supabase
    .from("previews")
    .select("redesign_html")
    .eq("slug", params.slug)
    .single();

  if (error || !data) {
    return new NextResponse("Preview not found", { status: 404 });
  }

  return new NextResponse(injectLucide(data.redesign_html), {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
