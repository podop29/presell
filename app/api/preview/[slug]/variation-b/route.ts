import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const { slug } = params;

  const { data, error } = await supabase
    .from("previews")
    .select("variation_b_html, expires_at")
    .eq("slug", slug)
    .single();

  if (error || !data || !data.variation_b_html) {
    const html = `<!DOCTYPE html><html><head><title>Not Found</title></head><body style="display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:sans-serif;color:#666;"><p>Preview not found</p></body></html>`;
    return new NextResponse(html, {
      status: 404,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  if (new Date(data.expires_at) < new Date()) {
    return new NextResponse("This preview has expired", { status: 410 });
  }

  return new NextResponse(data.variation_b_html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
