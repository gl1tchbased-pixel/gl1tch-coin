import { timingSafeEqual } from "node:crypto";
import type { IncomingMessage } from "node:http";

/**
 * Request guards for the bot's public HTTP server (it is reachable directly on Railway, so it can't rely on
 * the website's rate limits).
 */

/**
 * The caller's IP behind Railway's proxy. The socket address is the proxy itself (every user shares it), so
 * prefer the proxy-set X-Real-IP, then the LAST X-Forwarded-For hop (the one the proxy appended; earlier
 * entries can be forged by the client), then the socket.
 */
export function clientIp(req: Pick<IncomingMessage, "headers" | "socket">): string {
  const real = req.headers["x-real-ip"];
  const realIp = (Array.isArray(real) ? real[0] : real)?.trim();
  if (realIp) return realIp;
  const xff = req.headers["x-forwarded-for"];
  const hops = (Array.isArray(xff) ? xff.join(",") : xff ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (hops.length) return hops[hops.length - 1];
  return req.socket?.remoteAddress ?? "unknown";
}

/** Constant-time string comparison for shared secrets; false if either side is empty. */
export function safeEqual(a: string | undefined, b: string | undefined): boolean {
  if (!a || !b) return false;
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/**
 * Sliding-window limiter per key. Prunes idle keys so a flood of distinct IPs can't grow memory without bound.
 * `check` records the hit and returns true when the key is over its limit.
 */
export function createLimiter(windowMs = 60_000, maxKeys = 20_000) {
  const hits = new Map<string, number[]>();
  let calls = 0;

  function prune(now: number) {
    for (const [k, ts] of hits) if (!ts.length || now - ts[ts.length - 1] >= windowMs) hits.delete(k);
    // Still over the cap (a flood of distinct, active keys): drop the least recently used down to 90%, so the
    // next full prune is thousands of requests away instead of running on every one.
    const target = Math.floor(maxKeys * 0.9);
    for (const k of hits.keys()) {
      if (hits.size <= target) break;
      hits.delete(k);
    }
  }

  return {
    check(key: string, limit: number, now = Date.now()): boolean {
      if (++calls % 1000 === 0 || hits.size > maxKeys) prune(now);
      const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
      recent.push(now);
      // Only the newest limit+1 hits decide the answer, so a hammering key can't grow its array (or filter cost).
      if (recent.length > limit + 1) recent.splice(0, recent.length - limit - 1);
      // Re-insert so Map order is least-recently-used first: eviction must never free an active, blocked key.
      hits.delete(key);
      hits.set(key, recent);
      return recent.length > limit;
    },
    size: () => hits.size,
  };
}
