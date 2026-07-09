import { NextRequest, NextResponse } from "next/server";
import { latestPulse } from "@/lib/quantum/curby";
import { rateLimit, clientIp, sweepBuckets } from "@/lib/ratelimit";

/**
 * QUANTUM CORE — GET /api/quantum-core/pulse
 * Returns the latest FINALIZED CURBy quantum-randomness pulse (real NIST/CU Boulder
 * beacon). Read-only, server-side. Null-safe: if the current round isn't complete,
 * returns { ready:false } rather than a stale/fabricated value.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  sweepBuckets();
  const rl = rateLimit(`qpulse:${clientIp(req)}`, 30, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "rate limited" }, { status: 429, headers: { "retry-after": String(rl.retryAfter) } });

  const pulse = await latestPulse();
  if (!pulse) return NextResponse.json({ ready: false, source: "curby" }, { headers: { "cache-control": "public, s-maxage=20, stale-while-revalidate=40" } });
  return NextResponse.json(
    { ready: true, ...pulse },
    { headers: { "cache-control": "public, s-maxage=20, stale-while-revalidate=40" } }
  );
}
