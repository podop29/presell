import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase/admin";
import { injectLucide } from "@/lib/inject-lucide";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const { slug } = params;

  const { data, error } = await supabase
    .from("previews")
    .select("redesign_html, expires_at")
    .eq("slug", slug)
    .single();

  if (error || !data) {
    return new NextResponse("Preview not found", { status: 404 });
  }

  if (new Date(data.expires_at) < new Date()) {
    return new NextResponse("This preview has expired", { status: 410 });
  }

  return new NextResponse(injectLucide(data.redesign_html), {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "Content-Security-Policy": "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: https:; script-src 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://unpkg.com; connect-src 'none'",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
