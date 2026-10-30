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
import { getYieldSnapshot } from "@/lib/yield/client";
import { riskOf } from "@/lib/yield/risk";
import type { YieldChain, YieldKind, YieldSnapshot } from "@/lib/yield/types";
import { OFFICIAL } from "@/lib/official";
import { verdictCard } from "./verdict";
import { parseRandomQuery, randomCall } from "./random-call";
import { quickCheck, ScanCache, BATCH_MAX } from "./quick";

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

/** Recent successful scans on this instance: a re-check of the same token within minutes reads no upstream. */
const scanCache = new ScanCache(5 * 60_000, 500);
const cacheKey = (mint: string, chain: string) => `${chain || "auto"}:${mint}`;

/** One scan for the quick check and the batch: from the cache when fresh, else a paid-grade scan
 *  (degraded reads come back as 503 and are not cached). */
async function cachedScan(mint: string, chain: string): Promise<{ body: Record<string, unknown>; cached: boolean } | { status: number; body: Record<string, unknown> }> {
  const key = cacheKey(mint, chain);
  const hit = scanCache.get(key);
  if (hit) return { body: hit, cached: true };
  const report = paidScanOutcome(await runScanReport(mint, chain || undefined, "auto"));
  if (report.status !== 200) return { status: report.status, body: report.body };
  scanCache.set(key, report.body);
  return { body: report.body, cached: false };
}

export async function quickHandler(req: NextRequest): Promise<NextResponse> {
  const sp = req.nextUrl.searchParams;
  const parsed = parseScanInput({ mint: sp.get("mint"), chain: sp.get("chain"), q: null });
  if (!parsed || parsed.kind !== "scan") {
    return NextResponse.json({ error: `invalid input: provide ?mint (Solana or EVM address); ${NOT_CHARGED}` }, { status: 400 });
  }
  const r = await cachedScan(parsed.mint, parsed.chain);
  if ("status" in r) return NextResponse.json(r.body, { status: r.status });
  return NextResponse.json(quickCheck(r.body, r.cached));
}

const BATCH_CONCURRENCY = 5;
const BATCH_SCAN_TIMEOUT_MS = 20_000;

/** `?mints=a,b,c`: 1 to BATCH_MAX distinct valid addresses, or the 400 message. */
export function parseBatchInput(sp: URLSearchParams): { mints: string[]; chain: string } | { error: string } {
  const chain = (sp.get("chain") ?? "").trim().toLowerCase();
  const raw = (sp.get("mints") ?? "").split(",").map((m) => m.trim()).filter(Boolean);
  const mints = [...new Set(raw)];
  if (mints.length === 0) return { error: "provide ?mints=<address>,<address>,… (Solana or EVM)" };
  if (mints.length > BATCH_MAX) return { error: `at most ${BATCH_MAX} tokens per call` };
  for (const m of mints) {
    const p = parseScanInput({ mint: m, chain, q: null });
    if (!p || p.kind !== "scan") return { error: `invalid address or chain: ${m.slice(0, 64)}` };
  }
  return { mints, chain };
}

export async function batchHandler(req: NextRequest): Promise<NextResponse> {
  const input = parseBatchInput(req.nextUrl.searchParams);
  if ("error" in input) return NextResponse.json({ error: `${input.error}; ${NOT_CHARGED}` }, { status: 400 });
  const results: unknown[] = new Array(input.mints.length);
  for (let i = 0; i < input.mints.length; i += BATCH_CONCURRENCY) {
    const chunk = input.mints.slice(i, i + BATCH_CONCURRENCY);
    const done = await Promise.all(
      chunk.map((mint) =>
        Promise.race([
          cachedScan(mint, input.chain).catch(() => null),
          new Promise<null>((r) => setTimeout(() => r(null), BATCH_SCAN_TIMEOUT_MS)),
        ])
      )
    );
    done.forEach((r, j) => {
      const mint = chunk[j];
      results[i + j] = r && !("status" in r) ? quickCheck(r.body, r.cached) : { mint, error: "could not be read right now" };
    });
  }
  const ok = results.filter((r) => !(r as { error?: string }).error).length;
  // Nothing readable is a failed call: 503 settles nothing.
  if (ok === 0) return NextResponse.json({ error: `no token could be read, retry; ${NOT_CHARGED}` }, { status: 503 });
  return NextResponse.json({ count: results.length, ok, results });
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

/** `?since=` as Unix ms (seconds are accepted and scaled). Null when absent, "bad" when unreadable. */
export function parseSince(v: string | null): number | null | "bad" {
  if (v === null || v === "") return null;
  if (!/^\d{1,16}$/.test(v)) return "bad";
  const n = Number(v);
  return n < 1e12 ? n * 1000 : n;
}

/** The paid feed: the whole ranked sweep, or with `since` only the tokens first listed after it.
 *  `cursor` is the newest listing time in the sweep, to pass back as `since` on the next poll. */
export function radarView(r: RadarSweep, since: number | null, now = Date.now()) {
  const tokens = since === null ? r.ranked : r.ranked.filter((t) => t.listedAt !== null && t.listedAt > since);
  const newest = r.ranked.reduce((m, t) => (t.listedAt !== null && t.listedAt > m ? t.listedAt : m), since ?? 0);
  return {
    scanned: r.scanned,
    flagged: r.flagged,
    updatedAt: r.updatedAt,
    ageSeconds: Math.max(0, Math.round((now - r.updatedAt) / 1000)),
    since,
    cursor: newest || null,
    tokens,
  };
}

export async function radarHandler(req: NextRequest): Promise<NextResponse> {
  const since = parseSince(req.nextUrl.searchParams.get("since"));
  if (since === "bad") return NextResponse.json({ error: `invalid since: give Unix milliseconds (or seconds); ${NOT_CHARGED}` }, { status: 400 });
  const last = lastSweep();
  if (last && Date.now() - last.updatedAt < RADAR_SERVE_MAX_AGE_MS) {
    // sweepOnce returns the cached sweep while it is under 10 minutes old, so this refreshes only when due.
    after(() => sweepOnce().catch(() => undefined));
    return NextResponse.json(radarView(last, since));
  }
  const sweep = sweepOnce();
  const first = await Promise.race([sweep.catch(() => null), new Promise<null>((r) => setTimeout(() => r(null), RADAR_COLD_WAIT_MS))]);
  if (!first) {
    after(() => sweep.catch(() => undefined));
    return NextResponse.json({ error: `radar is warming up, retry in about a minute; ${NOT_CHARGED}` }, { status: 503, headers: { "retry-after": "60" } });
  }
  return NextResponse.json(radarView(first, since));
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

const YIELD_CHAINS = new Set<YieldChain>(["solana", "ethereum", "base", "arbitrum", "bsc", "tron", "robinhood"]);
const YIELD_KINDS = new Set<YieldKind>(["lending", "liquid-staking", "vault", "dex-lp"]);
const YIELD_ID_RE = /^[a-z0-9-]{3,80}$/;

export interface YieldFilter {
  chain: YieldChain | null;
  kind: YieldKind | null;
  stable: boolean | null;
  id: string | null;
}

export function parseYieldInput(sp: URLSearchParams): YieldFilter | { error: string } {
  const chainRaw = (sp.get("chain") ?? "").trim().toLowerCase();
  const kindRaw = (sp.get("kind") ?? "").trim().toLowerCase();
  const stableRaw = (sp.get("stable") ?? "").trim().toLowerCase();
  const idRaw = (sp.get("id") ?? "").trim().toLowerCase();

  if (chainRaw && !YIELD_CHAINS.has(chainRaw as YieldChain)) {
    return { error: "invalid chain: use solana, ethereum, base, arbitrum, bsc, tron or robinhood" };
  }
  if (kindRaw && !YIELD_KINDS.has(kindRaw as YieldKind)) {
    return { error: "invalid kind: use lending, liquid-staking, vault or dex-lp" };
  }
  if (stableRaw && stableRaw !== "true" && stableRaw !== "false" && stableRaw !== "1" && stableRaw !== "0") {
    return { error: "invalid stable: use true or false" };
  }
  if (idRaw && !YIELD_ID_RE.test(idRaw)) {
    return { error: "invalid pool id" };
  }
  return {
    chain: (chainRaw as YieldChain) || null,
    kind: (kindRaw as YieldKind) || null,
    stable: !stableRaw ? null : stableRaw === "true" || stableRaw === "1",
    id: idRaw || null,
  };
}

export function yieldView(snap: YieldSnapshot, filter: YieldFilter, siteUrl = OFFICIAL.SITE_URL) {
  const filtered = snap.opportunities.filter((o) => {
    if (filter.id && o.id !== filter.id) return false;
    if (filter.chain && o.chain !== filter.chain) return false;
    if (filter.kind && o.kind !== filter.kind) return false;
    if (filter.stable !== null && o.stable !== filter.stable) return false;
    return true;
  });

  const opportunities = filtered.map((o) => {
    const risk = riskOf(o);
    return {
      id: o.id,
      chain: o.chain,
      protocol: o.protocol,
      kind: o.kind,
      symbol: o.symbol,
      stable: o.stable,
      ilRisk: o.ilRisk,
      apy: o.apy,
      fullRangeApr: o.fullRangeApr ?? null,
      window: o.window,
      tvlUsd: o.tvlUsd,
      idleShare: o.idleShare,
      feePct: o.feePct,
      stale: o.stale,
      risk: {
        score: risk.score,
        level: risk.level,
        reasons: risk.reasons,
        warnings: risk.warnings,
      },
      cardUrl: `${siteUrl}/yield/${o.id}`,
    };
  });

  return {
    updatedAt: snap.updatedAt,
    count: opportunities.length,
    opportunities,
  };
}

export async function yieldHandler(req: NextRequest): Promise<NextResponse> {
  const parsed = parseYieldInput(req.nextUrl.searchParams);
  if ("error" in parsed) {
    return NextResponse.json({ error: `${parsed.error}; ${NOT_CHARGED}` }, { status: 400 });
  }
  const snap = await getYieldSnapshot();
  if (!snap) {
    return NextResponse.json({ error: `yield snapshot unavailable — retry; ${NOT_CHARGED}` }, { status: 503 });
  }
  return NextResponse.json(yieldView(snap, parsed));
}
