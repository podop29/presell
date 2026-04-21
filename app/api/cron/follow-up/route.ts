import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendFollowUpEmail } from "@/lib/email";
import { notifyError } from "@/lib/discord";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const WINDOW_MIN_HOURS = 24;
const WINDOW_MAX_HOURS = 48;
const BATCH_LIMIT = 100;

async function runFollowUps() {
  const now = Date.now();
  const windowEnd = new Date(now - WINDOW_MIN_HOURS * 3600_000).toISOString();
  const windowStart = new Date(now - WINDOW_MAX_HOURS * 3600_000).toISOString();

  const { data: candidates, error } = await supabaseAdmin
    .from("user_credits")
    .select("user_id")
    .eq("balance", 0)
    .is("follow_up_sent_at", null)
    .limit(BATCH_LIMIT);

  if (error) throw error;
  if (!candidates || candidates.length === 0) {
    return { sent: 0, scanned: 0, skipped: 0, failed: 0 };
  }

  let sent = 0;
  let skipped = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const { user_id } of candidates) {
    try {
      const { data: purchases } = await supabaseAdmin
        .from("credit_transactions")
        .select("id")
        .eq("user_id", user_id)
        .eq("type", "purchase")
        .limit(1);
      if (purchases && purchases.length > 0) {
        skipped++;
        continue;
      }

      const { data: previews } = await supabaseAdmin
        .from("previews")
        .select("slug, business_name, created_at")
        .eq("user_id", user_id)
        .gte("created_at", windowStart)
        .lte("created_at", windowEnd)
        .order("created_at", { ascending: true })
        .limit(1);

      if (!previews || previews.length === 0) {
        skipped++;
        continue;
      }

      const { data: authUser } =
        await supabaseAdmin.auth.admin.getUserById(user_id);
      const email = authUser?.user?.email;
      if (!email) {
        skipped++;
        continue;
      }

      const preview = previews[0];
      await sendFollowUpEmail({
        to: email,
        previewSlug: preview.slug,
        businessName: preview.business_name,
      });

      await supabaseAdmin
        .from("user_credits")
        .update({ follow_up_sent_at: new Date().toISOString() })
        .eq("user_id", user_id);

      sent++;
    } catch (err) {
      failed++;
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${user_id}: ${msg}`);
    }
  }

  if (errors.length > 0) {
    notifyError(
      "Follow-up email batch: partial failures",
      errors.slice(0, 10).join("\n")
    );
  }

  return { sent, scanned: candidates.length, skipped, failed };
}

async function handle(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runFollowUps();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("Follow-up cron error:", err);
    notifyError("Follow-up cron error", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return handle(req);
}

export async function GET(req: NextRequest) {
  return handle(req);
}
