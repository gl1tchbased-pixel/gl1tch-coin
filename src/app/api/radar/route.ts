import { NextResponse, type NextRequest } from "next/server";
import { rateLimit, clientIp, sweepBuckets } from "@/lib/ratelimit";
import { sweepOnce, lastSweep, type RadarSweep } from "@/lib/radar";

/**
 * RUG RADAR API — auto Hall of Shame. Pulls freshly-promoted ("boosted") tokens from
 * DexScreener (a notorious rug-hunting ground), runs each through the GL1TCH scanner,
 * and returns the riskiest catches. Read-only, server-side, cached hourly so cost stays
 * tiny. This is the only "scams we caught this week" feed in the meme space.
 * The sweep itself lives in src/lib/radar.ts (shared with the paid /api/x402/radar).
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** The free feed shows the eight riskiest catches of the latest sweep. */
const view = (r: RadarSweep) => ({ scanned: r.scanned, flagged: r.flagged, caught: r.ranked.slice(0, 8), updatedAt: r.updatedAt });

const CACHE = { "cache-control": "public, s-maxage=1800, stale-while-revalidate=3600" };

export async function GET(req: NextRequest) {
  // A query string would bypass the CDN cache and force a fresh sweep per request (cost / DoS
  // amplification), so every variant is sent to the one cacheable URL.
  if (req.nextUrl.search) return NextResponse.redirect(new URL("/api/radar", req.url), 308);
  sweepBuckets();
  if (!rateLimit(`radar:${clientIp(req)}`, 6, 60_000).ok) {
    const last = lastSweep();
    return last
      ? NextResponse.json(view(last), { headers: CACHE })
      : NextResponse.json({ error: "rate limited", scanned: 0, flagged: 0, caught: [] }, { status: 429, headers: { "retry-after": "60" } });
  }
  try {
    return NextResponse.json(view(await sweepOnce()), { headers: CACHE });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "radar failed", scanned: 0, flagged: 0, caught: [] }, { status: 200 });
  }
}
