import { NextResponse } from "next/server";
import { scanToken, applyVerified, isVerified } from "@/lib/scan";
import { bumpStats } from "@/lib/stats";
import { observeDeployer } from "@/lib/signal-graph";

/**
 * RUG RADAR API — auto Hall of Shame. Pulls freshly-promoted ("boosted") tokens from
 * DexScreener (a notorious rug-hunting ground), runs each through the GL1TCH scanner,
 * and returns the riskiest catches. Read-only, server-side, cached hourly so cost stays
 * tiny. This is the only "scams we caught this week" feed in the meme space.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const FLAGGED = new Set(["HIGH RISK", "RUG-SHAPED"]);
const withTimeout = <T,>(p: Promise<T>, ms: number) =>
  Promise.race([p, new Promise<null>((r) => setTimeout(() => r(null), ms))]);

type Caught = {
  chain: string; mint: string; name: string; symbol: string;
  verdict: string; score: number; reason: string; flagged: boolean;
};

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

export async function GET() {
  try {
    // Hunt where rugs actually live: freshly-added token profiles (mostly new pump.fun mints,
    // high rug rate) PLUS boosted tokens. Boosts alone are paid-for and skew legit — the graph
    // needs flagged deployers, so freshness matters.
    const [profiles, boosts] = await Promise.all([
      dexList("https://api.dexscreener.com/token-profiles/latest/v1"),
      dexList("https://api.dexscreener.com/token-boosts/latest/v1"),
    ]);
    // Solana only for v1 (native deep scan), de-dupe, cap the batch. Fresh profiles first.
    const seen = new Set<string>();
    const candidates = [...profiles, ...boosts]
      .filter((b) => b.chainId === "solana" && b.tokenAddress && !seen.has(b.tokenAddress) && seen.add(b.tokenAddress))
      .slice(0, 20);

    const scans = await Promise.all(
      candidates.map(async (c) => {
        const res = await withTimeout(scanToken(c.tokenAddress).catch(() => null), 14000);
        if (!res) return null;
        return isVerified(res.chain, res.mint) ? applyVerified(res) : res;
      })
    );

    let scanned = 0;
    let flaggedCount = 0;
    const ranked: Caught[] = [];
    for (const s of scans) {
      if (!s) continue;
      scanned++;
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
    if (scanned > 0) bumpStats({ n: scanned, flaggedN: flaggedCount });

    return NextResponse.json(
      { scanned, flagged: flaggedCount, caught: ranked.slice(0, 8), updatedAt: Date.now() },
      { headers: { "cache-control": "public, s-maxage=3600, stale-while-revalidate=7200" } }
    );
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "radar failed", scanned: 0, flagged: 0, caught: [] }, { status: 200 });
  }
}
