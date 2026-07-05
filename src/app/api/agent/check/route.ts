import { NextRequest, NextResponse } from "next/server";
import { agentCheck } from "@/lib/agent-trust";
import { isAddress, isChain } from "@/lib/validate";
import { rateLimit, clientIp, sweepBuckets } from "@/lib/ratelimit";

/**
 * AGENT TRUST API (v0) — GET /api/agent/check?address=<wallet>&chain=
 * Returns a trust assessment for an on-chain AI-agent wallet (identity + Signal Graph track
 * record). Read-only, server-side so the browser stays CORS-clean.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  sweepBuckets();
  const rl = rateLimit(`agent:${clientIp(req)}`, 40, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "rate limited" }, { status: 429, headers: { "retry-after": String(rl.retryAfter) } });

  const sp = req.nextUrl.searchParams;
  const address = (sp.get("address") ?? "").trim();
  const chain = (sp.get("chain") ?? "solana").trim();
  if (!isAddress(address)) return NextResponse.json({ error: "invalid address" }, { status: 400 });
  if (!isChain(chain)) return NextResponse.json({ error: "invalid chain" }, { status: 400 });

  const assessment = await agentCheck(address, chain);
  if (!assessment) return NextResponse.json({ error: "assessment unavailable" }, { status: 503 });
  return NextResponse.json(assessment, { headers: { "cache-control": "public, s-maxage=30, stale-while-revalidate=60" } });
}
