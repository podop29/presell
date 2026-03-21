import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * Server-side event tracking. Fire-and-forget — never blocks the caller.
 */
export function trackEvent(
  eventName: string,
  properties?: Record<string, unknown>,
  context?: { userId?: string; ip?: string; userAgent?: string }
): void {
  Promise.resolve(
    supabaseAdmin
      .from("analytics_events")
      .insert({
        event_name: eventName,
        user_id: context?.userId ?? null,
        properties: properties ?? {},
        ip_address: context?.ip ?? null,
        user_agent: context?.userAgent ?? null,
      })
  ).catch(() => {});
}

/**
 * Client-side event tracking. Sends to /api/analytics/track.
 */
export function trackEventClient(
  eventName: string,
  properties?: Record<string, unknown>
): void {
  fetch("/api/analytics/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ eventName, properties }),
  }).catch(() => {});
}
