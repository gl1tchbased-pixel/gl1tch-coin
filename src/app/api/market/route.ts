import { NextResponse, type NextRequest } from "next/server";
import { rateLimit, clientIp, sweepBuckets } from "@/lib/ratelimit";
import { resolveMarketSnapshot } from "@/lib/market";

/**
 * Live market data, resolved server-side (DexScreener → GeckoTerminal fallback)
 * so the browser fetches same-origin — no CORS, and the CDN cache shields the
 * upstream free APIs from per-visitor rate limits.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // Cache misses hit DexScreener/GeckoTerminal; cap per IP so cache-busting can't get our server rate-limited there.
  sweepBuckets();
  if (!rateLimit(`market:${clientIp(req)}`, 30, 60_000).ok) {
    return NextResponse.json({ error: "rate limited" }, { status: 429, headers: { "retry-after": "60" } });
  }
  const snap = await resolveMarketSnapshot();
  return NextResponse.json(snap, {
    headers: {
      // Edge/CDN caches one snapshot for ~30s and serves stale briefly while
      // revalidating — matches the client's 30s poll without hammering upstream.
      "cache-control": "public, s-maxage=30, stale-while-revalidate=60",
    },
  });
}
