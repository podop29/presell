import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  const { data, error } = await supabase
    .from("previews")
    .select("id, slug, original_url, created_at, expires_at")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Failed to fetch previews." }, { status: 500 });
  }

  return NextResponse.json(data);
}
