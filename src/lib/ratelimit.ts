/**
 * Best-effort rate limiter (Phase -1, PREMIUM-PLAN-v3). Per-instance sliding window keyed by
 * client IP. This is an application-level FIRST layer — the durable answer is an edge/WAF
 * (Cloudflare) + a shared store (Upstash Redis) once traffic warrants, per the plan's stack
 * note. In-memory is per-serverless-instance, so it catches bursts on a warm instance but is
 * not a global guarantee; documented as such.
 */

type Hit = { count: number; reset: number };
const buckets = new Map<string, Hit>();

export function clientIp(req: Request): string {
  const h = req.headers;
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    h.get("cf-connecting-ip") ||
    "unknown"
  );
}

/** Returns { ok, remaining, retryAfter }. Call once per request. */
export function rateLimit(key: string, limit = 30, windowMs = 60_000): { ok: boolean; remaining: number; retryAfter: number } {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.reset <= now) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfter: 0 };
  }
  b.count++;
  if (b.count > limit) return { ok: false, remaining: 0, retryAfter: Math.ceil((b.reset - now) / 1000) };
  return { ok: true, remaining: limit - b.count, retryAfter: 0 };
}

/** Occasionally evict expired buckets so the map can't grow unbounded. */
export function sweepBuckets(): void {
  const now = Date.now();
  if (buckets.size < 5000) return;
  for (const [k, v] of buckets) if (v.reset <= now) buckets.delete(k);
}
