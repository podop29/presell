#!/usr/bin/env node
/**
 * Pin featured preview slugs so they never expire.
 *
 * Sets expires_at to a far-future date for the given slugs. Nothing in the app
 * deletes previews — expiry is only a `expires_at < now` check — so this keeps
 * homepage examples live indefinitely.
 *
 * Usage:
 *   node scripts/pin-examples.mjs S2CjxqEK f7-DPDso L30vMjXH ...
 *   node scripts/pin-examples.mjs            # pins the default FEATURED list below
 */

import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

// Keep in sync with components/examples-gallery.tsx
const FEATURED = ["fwQZOlN7", "ZzmKUNqs", "lHvFfiJL", "G8uoC40j", "GaLlDV_G", "yrNP06js"];

const FAR_FUTURE = "2099-12-31T00:00:00.000Z";

const slugs = process.argv.slice(2).length ? process.argv.slice(2) : FEATURED;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

const { data, error } = await supabase
  .from("previews")
  .update({ expires_at: FAR_FUTURE })
  .in("slug", slugs)
  .select("slug, business_name");

if (error) {
  console.error("Failed:", error.message);
  process.exit(1);
}

const found = new Set((data || []).map((d) => d.slug));
console.log(`Pinned ${data?.length || 0}/${slugs.length} previews to never expire:`);
for (const d of data || []) console.log(`  ✓ ${d.slug}  ${d.business_name || ""}`);
for (const s of slugs) if (!found.has(s)) console.log(`  ✗ ${s}  (not found)`);
