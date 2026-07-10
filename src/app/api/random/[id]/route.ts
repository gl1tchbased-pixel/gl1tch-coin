import { NextRequest, NextResponse } from "next/server";
import { fetchRandomResult } from "@/lib/random-service";
import { rateLimit, clientIp, sweepBuckets } from "@/lib/ratelimit";

/**
 * GET /api/random/:id — the public status/result of a randomness request.
 * Reveals on target-round maturity (the bot fetches + integrity-checks the drand round
 * on demand). Public: the result + full proof is meant to be verified by anyone, not just
 * the requester. Reading is free; only issuing a request needs a holder key.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  sweepBuckets();
  const rl = rateLimit(`randomget:${clientIp(req)}`, 120, 60_000);
  if (!rl.ok) return NextResponse.json({ ok: false, error: "rate limited" }, { status: 429, headers: { "retry-after": String(rl.retryAfter) } });

  const { id } = await params;
  if (!/^[0-9a-f]{64}$/.test(id)) return NextResponse.json({ ok: false, error: "bad id" }, { status: 400 });

  const out = await fetchRandomResult(id);
  return NextResponse.json(out.body, { status: out.status, headers: { "cache-control": "no-store" } });
}
