import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * Supabase-backed rate limiter. Persists across serverless invocations.
 *
 * Requires a `rate_limits` table:
 *
 *   create table rate_limits (
 *     key text primary key,
 *     count int not null default 1,
 *     reset_at timestamptz not null
 *   );
 *
 *   create index idx_rate_limits_reset on rate_limits (reset_at);
 */
export async function rateLimit(
  key: string,
  { maxRequests, windowMs }: { maxRequests: number; windowMs: number }
): Promise<{ success: boolean; retryAfter?: number }> {
  const now = new Date();
  const resetAt = new Date(now.getTime() + windowMs);

  // Try to increment existing non-expired entry
  const { data: existing } = await supabaseAdmin
    .from("rate_limits")
    .select("count, reset_at")
    .eq("key", key)
    .gt("reset_at", now.toISOString())
    .single();

  if (existing) {
    if (existing.count >= maxRequests) {
      const retryAfter = Math.ceil(
        (new Date(existing.reset_at).getTime() - now.getTime()) / 1000
      );
      return { success: false, retryAfter };
    }

    await supabaseAdmin
      .from("rate_limits")
      .update({ count: existing.count + 1 })
      .eq("key", key);

    return { success: true };
  }

  // No active window — upsert a fresh entry
  await supabaseAdmin.from("rate_limits").upsert(
    { key, count: 1, reset_at: resetAt.toISOString() },
    { onConflict: "key" }
  );

  return { success: true };
}

/**
 * Normalize a client IP into a stable abuse key.
 *
 * IPv4 is used as-is. IPv6 is truncated to its /64 prefix because ISPs hand a
 * whole /64 to a single subscriber — without this, an abuser gets a brand-new
 * "IP" for every request just by changing the low bits.
 */
export function normalizeIP(raw: string | null | undefined): string {
  let ip = (raw || "").trim().toLowerCase();

  // "[::1]:8080" → "::1"
  const bracketed = ip.match(/^\[([^\]]+)\](?::\d+)?$/);
  if (bracketed) ip = bracketed[1];
  ip = ip.split("%")[0]; // drop IPv6 zone id

  if (!ip || ip === "unknown") return "unknown";

  // IPv4, optionally with the :port suffix some proxies append
  const v4 = ip.match(/^(\d{1,3}(?:\.\d{1,3}){3})(?::\d+)?$/);
  if (v4) return v4[1];

  if (!ip.includes(":")) return ip;

  // IPv4-mapped IPv6 (::ffff:1.2.3.4) — key on the embedded IPv4
  const mapped = ip.match(/(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (mapped) return mapped[1];

  // Expand "::", then keep the first four hextets (the /64 prefix)
  let parts: string[];
  if (ip.includes("::")) {
    const [head, tail] = ip.split("::");
    const headParts = head ? head.split(":") : [];
    const tailParts = tail ? tail.split(":") : [];
    const gap = Math.max(0, 8 - headParts.length - tailParts.length);
    parts = [...headParts, ...Array(gap).fill("0"), ...tailParts];
  } else {
    parts = ip.split(":");
  }

  return (
    parts
      .slice(0, 4)
      .map((p) => (p || "0").padStart(4, "0"))
      .join(":") + "::"
  );
}

/** Extract IP from request headers (works behind proxies) */
export function getIP(headers: Headers): string {
  return normalizeIP(
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      headers.get("x-real-ip") ||
      "unknown"
  );
}
