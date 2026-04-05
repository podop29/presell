import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase/admin";
import { getUser } from "@/lib/auth";

export async function PUT(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = params;
  const { name, email } = await req.json();

  if (typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "Name is required." }, { status: 400 });
  }
  if (typeof email !== "string" || email.trim().length === 0) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("previews")
    .select("user_id")
    .eq("slug", slug)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Preview not found." }, { status: 404 });
  }

  if (data.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error: updateError } = await supabase
    .from("previews")
    .update({ dev_name: name.trim(), dev_email: email.trim() })
    .eq("slug", slug);

  if (updateError) {
    return NextResponse.json({ error: "Failed to update details." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, name: name.trim(), email: email.trim() });
}
