/**
 * Send the Product Hunt launch email to every PitchKit user who has
 * generated at least one preview.
 *
 * Run with:
 *   npx tsx scripts/send-product-hunt-launch.ts                    # dry run
 *   npx tsx scripts/send-product-hunt-launch.ts --test you@x.com --url <ph-url>
 *   npx tsx scripts/send-product-hunt-launch.ts --send --url <ph-url>
 *
 * Modes:
 *   (default)            — dry run. Prints the recipient count and the first
 *                          10 emails. No mail is sent.
 *   --send               — actually send. Requires --url.
 *   --test <email>       — send a single email to <email> only. Requires --url.
 *   --limit <n>          — cap the number of recipients (incremental rollout).
 *
 * Idempotency:
 *   Sent user_ids are appended to scripts/.product-hunt-sent.json so re-runs
 *   skip anyone already emailed. Delete that file to start fresh.
 */
import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import fs from "node:fs";
import path from "node:path";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendProductHuntLaunchEmail } from "@/lib/email";

const SENT_FILE = path.join(process.cwd(), "scripts", ".product-hunt-sent.json");
const PER_SECOND = 4; // Resend account headers reported limit=5/sec; leave headroom.
const SAMPLE_PRINT = 10;

type Args = {
  url: string | null;
  send: boolean;
  test: string | null;
  limit: number | null;
};

function parseArgs(argv: string[]): Args {
  const args: Args = { url: null, send: false, test: null, limit: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--send") args.send = true;
    else if (a === "--url") args.url = argv[++i] ?? null;
    else if (a === "--test") args.test = argv[++i] ?? null;
    else if (a === "--limit") {
      const n = Number(argv[++i]);
      if (Number.isFinite(n) && n > 0) args.limit = Math.floor(n);
    }
  }
  return args;
}

function loadSent(): Set<string> {
  try {
    const raw = fs.readFileSync(SENT_FILE, "utf8");
    const arr = JSON.parse(raw) as string[];
    return new Set(arr);
  } catch {
    return new Set();
  }
}

function appendSent(userId: string) {
  const current = loadSent();
  current.add(userId);
  fs.writeFileSync(SENT_FILE, JSON.stringify(Array.from(current), null, 2));
}

async function fetchAllPreviewUserIds(): Promise<string[]> {
  // Pull every user_id that owns a preview. Paginate to avoid 1000-row caps.
  const ids = new Set<string>();
  const PAGE = 1000;
  let from = 0;
  while (true) {
    const { data, error } = await supabaseAdmin
      .from("previews")
      .select("user_id")
      .not("user_id", "is", null)
      .range(from, from + PAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    for (const row of data) {
      if (row.user_id) ids.add(row.user_id as string);
    }
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return Array.from(ids);
}

async function resolveEmail(userId: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
  if (error) return null;
  return data?.user?.email ?? null;
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  // ── Test-mode: single email send ──
  if (args.test) {
    if (!args.url) {
      console.error("--test requires --url <product-hunt-url>");
      process.exit(1);
    }
    console.log(`Sending test email to ${args.test} ...`);
    const res = await sendProductHuntLaunchEmail({
      to: args.test,
      productHuntUrl: args.url,
    });
    console.log("Resend response:", res);
    return;
  }

  // ── Build recipient list ──
  console.log("Fetching user_ids with at least one preview ...");
  const userIds = await fetchAllPreviewUserIds();
  console.log(`  ${userIds.length} distinct users found`);

  const sent = loadSent();
  const remaining = userIds.filter((id) => !sent.has(id));
  console.log(`  ${sent.size} already emailed (skipped)`);
  console.log(`  ${remaining.length} pending`);

  console.log("Resolving emails ...");
  const recipients: { userId: string; email: string }[] = [];
  for (const userId of remaining) {
    const email = await resolveEmail(userId);
    if (email) recipients.push({ userId, email });
  }
  console.log(`  ${recipients.length} resolved to a real email address`);

  const capped = args.limit ? recipients.slice(0, args.limit) : recipients;

  // ── Dry run (default) ──
  if (!args.send) {
    console.log("");
    console.log(`DRY RUN — would send to ${capped.length} recipient(s).`);
    console.log(`First ${Math.min(SAMPLE_PRINT, capped.length)}:`);
    for (const r of capped.slice(0, SAMPLE_PRINT)) {
      console.log(`  - ${r.email}`);
    }
    console.log("");
    console.log("Re-run with --send --url <product-hunt-url> to actually send.");
    return;
  }

  if (!args.url) {
    console.error("--send requires --url <product-hunt-url>");
    process.exit(1);
  }

  // ── Send ──
  console.log("");
  console.log(`SENDING to ${capped.length} recipient(s) at ~${PER_SECOND}/sec ...`);
  const intervalMs = Math.ceil(1000 / PER_SECOND);

  let ok = 0;
  let failed = 0;
  for (let i = 0; i < capped.length; i++) {
    const r = capped[i];
    try {
      await sendProductHuntLaunchEmail({
        to: r.email,
        productHuntUrl: args.url,
      });
      appendSent(r.userId);
      ok++;
      if (i % 25 === 0 || i === capped.length - 1) {
        console.log(`  [${i + 1}/${capped.length}] sent=${ok} failed=${failed}`);
      }
    } catch (err) {
      failed++;
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  FAIL ${r.email}: ${msg}`);
    }
    if (i < capped.length - 1) await sleep(intervalMs);
  }

  console.log("");
  console.log(`Done. sent=${ok} failed=${failed}`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
