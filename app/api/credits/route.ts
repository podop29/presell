import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { getBalance } from "@/lib/credits";
import { getIP } from "@/lib/rate-limit";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { notifyError } from "@/lib/discord";

export async function GET(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // This is usually the first endpoint a new account hits, so it's where the
    // credits row (and the IP-capped signup bonus) gets created.
    const balance = await getBalance(user.id, getIP(req.headers));

    const { data: transactions } = await supabaseAdmin
      .from("credit_transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    return NextResponse.json({ balance, transactions: transactions ?? [] });
  } catch (err) {
    console.error("Credits error:", err);
    notifyError("Credits fetch error", err);
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
