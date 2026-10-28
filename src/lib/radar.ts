/**
 * RUG RADAR sweep — pulls freshly-promoted ("boosted") and freshly-profiled tokens from DexScreener
 * (a notorious rug-hunting ground), runs each through the GL1TCH scanner and ranks them riskiest
 * first. Shared by the free /api/radar (top 8, CDN-cached) and the paid /api/x402/radar (the whole
 * ranked sweep). Read-only and server-side; one sweep per instance per 10 minutes keeps cost tiny.
 */

import { scanToken, applyVerified, isVerified } from "@/lib/scan";
import { bumpStats } from "@/lib/stats";
import { observeDeployer } from "@/lib/signal-graph";
import { submitSweep } from "@/lib/attest/submit";
import type { VerdictRecord } from "@/lib/attest/merkle";

const FLAGGED = new Set(["HIGH RISK", "RUG-SHAPED"]);
const withTimeout = <T,>(p: Promise<T>, ms: number) =>
  Promise.race([p, new Promise<null>((r) => setTimeout(() => r(null), ms))]);

export type Caught = {
  chain: string; mint: string; name: string; symbol: string;
  verdict: string; score: number; reason: string; flagged: boolean;
};

export type RadarSweep = { scanned: number; flagged: number; ranked: Caught[]; updatedAt: number };

function topReason(checks: { label: string; status: string; value: string; explain?: string }[]): string {
  const fail = checks.find((c) => c.status === "fail");
  if (fail) return `${fail.label}: ${fail.value}`;
  const warn = checks.find((c) => c.status === "warn");
  if (warn) return `${warn.label}: ${warn.value}`;
  return "passed contract checks · still DYOR";
}

async function dexList(url: string): Promise<{ chainId: string; tokenAddress: string }[]> {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(9000) });
    if (!r.ok) return [];
    const j = await r.json();
    return Array.isArray(j) ? j : (j?.data ?? []);
  } catch {
    return [];
  }
}

// Batch + concurrency are env-tunable so coverage can grow without a code change.
// Bigger batch = more distinct deployers per sweep; chunked concurrency keeps the RPC
// (Helius) from bursting and rate-limiting, which would silently drop scans.
const BATCH = Math.max(1, Math.min(80, Number(process.env.RADAR_BATCH) || 40));
const CONCURRENCY = Math.max(1, Math.min(20, Number(process.env.RADAR_CONCURRENCY) || 10));

// One sweep scans up to BATCH tokens, so it must never be triggerable on demand: an instance reuses its last
// result for MIN_SWEEP_GAP_MS and concurrent requests share the sweep already running.
const MIN_SWEEP_GAP_MS = 10 * 60_000;
let last: RadarSweep | null = null;
let running: Promise<RadarSweep> | null = null;

/** The last finished sweep on this instance, if any. */
export function lastSweep(): RadarSweep | null {
  return last;
}

export function sweepOnce(): Promise<RadarSweep> {
  if (last && Date.now() - last.updatedAt < MIN_SWEEP_GAP_MS) return Promise.resolve(last);
  running ??= sweep()
    .then((r) => (last = r))
    .finally(() => {
      running = null;
    });
  return running;
}

async function sweep(): Promise<RadarSweep> {
  const sweepMs = Date.now();
  // Hunt where rugs actually live: freshly-added token profiles (mostly new pump.fun mints,
  // high rug rate) PLUS boosted tokens (latest + top). Boosts alone are paid-for and skew
  // legit — the graph needs flagged deployers, so fresh profiles come first.
  const [profiles, boostsLatest, boostsTop] = await Promise.all([
    dexList("https://api.dexscreener.com/token-profiles/latest/v1"),
    dexList("https://api.dexscreener.com/token-boosts/latest/v1"),
    dexList("https://api.dexscreener.com/token-boosts/top/v1"),
  ]);
  // Solana only for v1 (native deep scan), de-dupe, cap the batch. Fresh profiles first.
  const seen = new Set<string>();
  const candidates = [...profiles, ...boostsLatest, ...boostsTop]
    .filter((b) => b.chainId === "solana" && b.tokenAddress && !seen.has(b.tokenAddress) && seen.add(b.tokenAddress))
    .slice(0, BATCH);

  // Scan in bounded-concurrency chunks (avoid a 40-wide RPC burst → rate-limit → dropped reads).
  const scans: (Awaited<ReturnType<typeof scanToken>> | null)[] = [];
  for (let i = 0; i < candidates.length; i += CONCURRENCY) {
    const chunk = candidates.slice(i, i + CONCURRENCY);
    const part = await Promise.all(
      chunk.map(async (c) => {
        const res = await withTimeout(scanToken(c.tokenAddress).catch(() => null), 14000);
        if (!res) return null;
        const done = { ...res, scannedAt: Date.now() };
        return isVerified(done.chain, done.mint) ? applyVerified(done) : done;
      })
    );
    scans.push(...part);
  }

  let scanned = 0;
  let flaggedCount = 0;
  const ranked: Caught[] = [];
  const sealed: VerdictRecord[] = [];
  for (const s of scans) {
    if (!s) continue;
    scanned++;
    sealed.push({ chain: s.chain, mint: s.mint, verdict: s.verdict, score: s.score, scannedAt: s.scannedAt || sweepMs });
    const flagged = FLAGGED.has(s.verdict);
    if (flagged) flaggedCount++;
    // Feed the Signal Graph: the hourly sweep of fresh boosted tokens is exactly where
    // serial ruggers surface. Fire-and-forget; confident, unverified reads only.
    if (s.meta?.deployer && !s.verified && (typeof s.confidence !== "number" || s.confidence >= 60)) {
      observeDeployer({
        deployer: s.meta.deployer, chain: s.chain, mint: s.mint,
        verdict: s.verdict, score: s.score, name: s.name, symbol: s.symbol,
      });
    }
    ranked.push({
      chain: s.chain, mint: s.mint,
      name: s.name || s.symbol || s.mint.slice(0, 6),
      symbol: s.symbol || "",
      verdict: s.verdict, score: s.score,
      reason: topReason(s.checks), flagged,
    });
  }
  ranked.sort((a, b) => a.score - b.score); // riskiest first

  // Hourly sweep doubles as the counter's heartbeat (real scans, real catches).
  if (scanned > 0) bumpStats({ n: scanned, flaggedN: flaggedCount, kind: "auto" });
  // Every verdict of this sweep goes to the bot to be sealed on Solana.
  submitSweep(sealed, sweepMs);

  return { scanned, flagged: flaggedCount, ranked, updatedAt: Date.now() };
}
