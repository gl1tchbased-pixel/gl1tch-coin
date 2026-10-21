import { NextRequest, NextResponse } from "next/server";
import { rateLimit, clientIp, sweepBuckets } from "@/lib/ratelimit";
import { PRIMARY_PAIR } from "@/lib/market";
import { parseGeckoOhlcv, stepSeries } from "@/lib/ohlcv";

/**
 * GET /api/market/history?range=7d|30d|all — $GL1TCH price history for the network panel.
 * GeckoTerminal only returns candles for periods with trades (the pool trades rarely), so this
 * returns a step series: price held flat between real trades, each trade marked. CDN-cached.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LAUNCH = Date.parse("2026-05-29T00:00:00Z");
const RANGES = {
  "7d": { tf: "hour?aggregate=4&limit=60", span: 7 * 86_400_000 },
  "30d": { tf: "day?limit=40", span: 30 * 86_400_000 },
  all: { tf: "day?limit=1000", span: 0 },
} as const;

export async function GET(req: NextRequest) {
  sweepBuckets();
  if (!rateLimit(`market-history:${clientIp(req)}`, 30, 60_000).ok) {
    return NextResponse.json({ error: "rate limited" }, { status: 429, headers: { "retry-after": "60" } });
  }
  const key = (req.nextUrl.searchParams.get("range") ?? "30d") as keyof typeof RANGES;
  const range = RANGES[key] ? key : "30d";
  const cfg = RANGES[range];
  const now = Date.now();
  try {
    const url = `https://api.geckoterminal.com/api/v2/networks/solana/pools/${PRIMARY_PAIR}/ohlcv/${cfg.tf}&currency=usd`;
    const r = await fetch(url, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(8000), next: { revalidate: 600 } });
    if (!r.ok) throw new Error(`upstream ${r.status}`);
    const j = await r.json();
    const candles = parseGeckoOhlcv(j?.data?.attributes?.ohlcv_list);
    const start = cfg.span ? now - cfg.span : LAUNCH;
    const points = stepSeries(candles, start, now);
    return NextResponse.json(
      { range, points, trades: points.filter((p) => p.traded).length, updatedAt: now, source: "GeckoTerminal" },
      { headers: { "cache-control": "public, s-maxage=600, stale-while-revalidate=1200" } },
    );
  } catch (e) {
    return NextResponse.json(
      { range, points: [], trades: 0, updatedAt: now, source: "GeckoTerminal", error: e instanceof Error ? e.message : "history unavailable" },
      { status: 200, headers: { "cache-control": "public, s-maxage=60" } },
    );
  }
}
