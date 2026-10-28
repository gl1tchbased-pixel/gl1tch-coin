/**
 * Handlers behind the paid agent API (wrapped by paidRoute). Each validates its own input: x402
 * discovery probes call without parameters and must reach the 402 challenge first, and a 400 is
 * never settled, so bad input costs the caller nothing.
 */

import { NextRequest, NextResponse, after } from "next/server";
import { runScanReport, paidScanOutcome, type ScanReport } from "@/lib/scan-report";
import { agentCheck } from "@/lib/agent-trust";
import { deployerReputation } from "@/lib/signal-graph";
import { parseScanInput, isAddress, isChain } from "@/lib/validate";
import { sweepOnce, lastSweep, type RadarSweep } from "@/lib/radar";
import { OFFICIAL } from "@/lib/official";
import { verdictCard } from "./verdict";
import { parseRandomQuery, randomCall } from "./random-call";

const NOT_CHARGED = "you were not charged";

/** A paid scan of ?mint (&chain), or the 400 that stops it before any work. */
async function paidScan(req: NextRequest): Promise<ScanReport | NextResponse> {
  const sp = req.nextUrl.searchParams;
  const parsed = parseScanInput({ mint: sp.get("mint"), chain: sp.get("chain"), q: null });
  if (!parsed || parsed.kind !== "scan") {
    return NextResponse.json({ error: `invalid input: provide ?mint (Solana or EVM address); ${NOT_CHARGED}` }, { status: 400 });
  }
  // Agents aren't people: their scans count as automation; their payments show on /revenue.
  return paidScanOutcome(await runScanReport(parsed.mint, parsed.chain, "auto"));
}

export async function scanHandler(req: NextRequest): Promise<NextResponse> {
  const report = await paidScan(req);
  if (report instanceof NextResponse) return report;
  return NextResponse.json(report.body, { status: report.status });
}

export async function verdictHandler(req: NextRequest): Promise<NextResponse> {
  const report = await paidScan(req);
  if (report instanceof NextResponse) return report;
  if (report.status !== 200) return NextResponse.json(report.body, { status: report.status });
  return NextResponse.json(verdictCard(report.body, OFFICIAL.SITE_URL));
}

/** A sweep this old is still served while a fresh one runs after the response. */
const RADAR_SERVE_MAX_AGE_MS = 70 * 60_000;
/** A cold instance waits this long for its first sweep, then answers 503 (not charged) and keeps sweeping. */
const RADAR_COLD_WAIT_MS = 25_000;

const radarView = (r: RadarSweep) => ({
  scanned: r.scanned,
  flagged: r.flagged,
  updatedAt: r.updatedAt,
  ageSeconds: Math.max(0, Math.round((Date.now() - r.updatedAt) / 1000)),
  tokens: r.ranked,
});

export async function radarHandler(): Promise<NextResponse> {
  const last = lastSweep();
  if (last && Date.now() - last.updatedAt < RADAR_SERVE_MAX_AGE_MS) {
    // sweepOnce returns the cached sweep while it is under 10 minutes old, so this refreshes only when due.
    after(() => sweepOnce().catch(() => undefined));
    return NextResponse.json(radarView(last));
  }
  const sweep = sweepOnce();
  const first = await Promise.race([sweep.catch(() => null), new Promise<null>((r) => setTimeout(() => r(null), RADAR_COLD_WAIT_MS))]);
  if (!first) {
    after(() => sweep.catch(() => undefined));
    return NextResponse.json({ error: `radar is warming up, retry in about a minute; ${NOT_CHARGED}` }, { status: 503, headers: { "retry-after": "60" } });
  }
  return NextResponse.json(radarView(first));
}

export async function randomHandler(req: NextRequest): Promise<NextResponse> {
  const parsed = parseRandomQuery(req.nextUrl.searchParams);
  if ("error" in parsed) return NextResponse.json({ error: `${parsed.error}; ${NOT_CHARGED}` }, { status: 400 });
  const result = await randomCall(parsed.spec, parsed.salt);
  if (!result) return NextResponse.json({ error: `randomness beacon unavailable, retry; ${NOT_CHARGED}` }, { status: 503 });
  return NextResponse.json(result);
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
