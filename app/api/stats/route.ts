import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const revalidate = 300; // cache for 5 minutes

export async function GET() {
  try {
    const { count } = await supabaseAdmin
      .from("previews")
      .select("*", { count: "exact", head: true });

    return NextResponse.json({ count: count ?? 0 });
  } catch {
    return NextResponse.json({ count: 0 });
  }
}
