import { NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase/admin";
import { getUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("previews")
    .select("id, slug, original_url, variation_a_style, created_at, expires_at, cold_email_subject, cold_email_body, business_name")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Failed to fetch previews." }, { status: 500 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const previewBaseUrl = process.env.NEXT_PUBLIC_PREVIEW_URL || baseUrl;

  return NextResponse.json({ previews: data, previewBaseUrl });
}
