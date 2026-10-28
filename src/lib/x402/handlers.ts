/**
 * Handlers behind the paid agent API (wrapped by paidRoute). Each validates its own input: x402
 * discovery probes call without parameters and must reach the 402 challenge first, and a 400 is
 * never settled, so bad input costs the caller nothing.
 */

import { NextRequest, NextResponse } from "next/server";
import { runScanReport, paidScanOutcome } from "@/lib/scan-report";
import { agentCheck } from "@/lib/agent-trust";
import { deployerReputation } from "@/lib/signal-graph";
import { parseScanInput, isAddress, isChain } from "@/lib/validate";

const NOT_CHARGED = "you were not charged";

export async function scanHandler(req: NextRequest): Promise<NextResponse> {
  const sp = req.nextUrl.searchParams;
  const parsed = parseScanInput({ mint: sp.get("mint"), chain: sp.get("chain"), q: null });
  if (!parsed || parsed.kind !== "scan") {
    return NextResponse.json({ error: `invalid input: provide ?mint (Solana or EVM address); ${NOT_CHARGED}` }, { status: 400 });
  }
  // Agents aren't people: their scans count as automation; their payments show on /revenue.
  const report = paidScanOutcome(await runScanReport(parsed.mint, parsed.chain, "auto"));
  return NextResponse.json(report.body, { status: report.status });
}

function walletInput(req: NextRequest): { address: string; chain: string } | NextResponse {
  const sp = req.nextUrl.searchParams;
  const address = (sp.get("address") ?? "").trim();
  const chain = (sp.get("chain") ?? "solana").trim().toLowerCase();
  if (!isAddress(address)) return NextResponse.json({ error: `invalid address; ${NOT_CHARGED}` }, { status: 400 });
  if (!isChain(chain)) return NextResponse.json({ error: `invalid chain; ${NOT_CHARGED}` }, { status: 400 });
  return { address, chain };
}

export async function agentHandler(req: NextRequest): Promise<NextResponse> {
  const input = walletInput(req);
  if (input instanceof NextResponse) return input;
  const assessment = await agentCheck(input.address, input.chain);
  if (!assessment) return NextResponse.json({ error: `assessment unavailable — retry; ${NOT_CHARGED}` }, { status: 503 });
  return NextResponse.json(assessment);
}

export async function deployerHandler(req: NextRequest): Promise<NextResponse> {
  const input = walletInput(req);
  if (input instanceof NextResponse) return input;
  const reputation = await deployerReputation(input.address, input.chain);
  if (!reputation) return NextResponse.json({ error: `reputation unavailable — retry; ${NOT_CHARGED}` }, { status: 503 });
  return NextResponse.json({ address: input.address, chain: input.chain, reputation });
}
