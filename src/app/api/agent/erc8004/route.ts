import { NextRequest, NextResponse } from "next/server";
import { agentCheck, erc8004Registration } from "@/lib/agent-trust";
import { isAddress, isChain } from "@/lib/validate";
import { rateLimit, clientIp, sweepBuckets } from "@/lib/ratelimit";

/**
 * ERC-8004 alignment — GET /api/agent/erc8004?address=<wallet>&chain=
 * Emits an ERC-8004 (Trustless Agents) *compatible* Agent Registration File for a GL1TCH-assessed
 * agent, with our trust score mapped into a Reputation-Registry-shaped feedback record. This lets
 * agents/frameworks that already speak ERC-8004 consume GL1TCH trust signals directly.
 * GL1TCH is off-chain and does not deploy the on-chain Identity Registry. Ref: EIP-8004.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  sweepBuckets();
  const rl = rateLimit(`erc8004:${clientIp(req)}`, 40, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "rate limited" }, { status: 429, headers: { "retry-after": String(rl.retryAfter) } });

  const sp = req.nextUrl.searchParams;
  const address = (sp.get("address") ?? "").trim();
  const chain = (sp.get("chain") ?? "solana").trim();
  if (!isAddress(address)) return NextResponse.json({ error: "invalid address" }, { status: 400 });
  if (!isChain(chain)) return NextResponse.json({ error: "invalid chain" }, { status: 400 });

  const assessment = await agentCheck(address, chain);
  if (!assessment) return NextResponse.json({ error: "assessment unavailable" }, { status: 503 });

  const origin = req.nextUrl.origin;
  const file = erc8004Registration(assessment, origin);
  return NextResponse.json(file, {
    headers: {
      "cache-control": "public, s-maxage=30, stale-while-revalidate=60",
      "x-erc": "8004",
    },
  });
}
