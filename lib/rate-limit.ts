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

/** Extract IP from request headers (works behind proxies) */
export function getIP(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    "unknown"
  );
}
