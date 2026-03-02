import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

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

  return new NextResponse(data.redesign_html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
