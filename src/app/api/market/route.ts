import { NextResponse } from "next/server";
import { resolveMarketSnapshot } from "@/lib/market";

/**
 * Live market data, resolved server-side (DexScreener → GeckoTerminal fallback)
 * so the browser fetches same-origin — no CORS, and the CDN cache shields the
 * upstream free APIs from per-visitor rate limits.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const snap = await resolveMarketSnapshot();
  return NextResponse.json(snap, {
    headers: {
      // Edge/CDN caches one snapshot for ~30s and serves stale briefly while
      // revalidating — matches the client's 30s poll without hammering upstream.
      "cache-control": "public, s-maxage=30, stale-while-revalidate=60",
    },
  });
}
