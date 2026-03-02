const hits = new Map<string, { count: number; resetAt: number }>();

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  hits.forEach((value, key) => {
    if (now > value.resetAt) hits.delete(key);
  });
}, 5 * 60 * 1000);

/**
 * Simple in-memory rate limiter.
 * Returns { success: true } if under limit, or { success: false, retryAfter } if over.
 */
export function rateLimit(
  key: string,
  { maxRequests, windowMs }: { maxRequests: number; windowMs: number }
): { success: boolean; retryAfter?: number } {
  const now = Date.now();
  const entry = hits.get(key);

  if (!entry || now > entry.resetAt) {
    hits.set(key, { count: 1, resetAt: now + windowMs });
    return { success: true };
  }

  if (entry.count < maxRequests) {
    entry.count++;
    return { success: true };
  }

  return {
    success: false,
    retryAfter: Math.ceil((entry.resetAt - now) / 1000),
  };
}

/** Extract IP from request headers (works behind proxies) */
export function getIP(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    "unknown"
  );
}
