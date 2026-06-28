import { NextResponse } from "next/server";
import { scanToken, applyVerified, isVerified } from "@/lib/scan";

/**
 * RUG RADAR API — auto Hall of Shame. Pulls freshly-promoted ("boosted") tokens from
 * DexScreener (a notorious rug-hunting ground), runs each through the GL1TCH scanner,
 * and returns the riskiest catches. Read-only, server-side, cached hourly so cost stays
 * tiny. This is the only "scams we caught this week" feed in the meme space.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const RISKY = new Set(["HIGH RISK", "RUG-SHAPED", "CAUTION"]);
const withTimeout = <T,>(p: Promise<T>, ms: number) =>
  Promise.race([p, new Promise<null>((r) => setTimeout(() => r(null), ms))]);

type Caught = {
  chain: string; mint: string; name: string; symbol: string;
  verdict: string; score: number; reason: string;
};

function topReason(checks: { label: string; status: string; value: string; explain?: string }[]): string {
  const fail = checks.find((c) => c.status === "fail");
  if (fail) return `${fail.label}: ${fail.value}`;
  const warn = checks.find((c) => c.status === "warn");
  return warn ? `${warn.label}: ${warn.value}` : "multiple risk flags";
}

export async function GET() {
  try {
    const r = await fetch("https://api.dexscreener.com/token-boosts/latest/v1", { signal: AbortSignal.timeout(9000) });
    const list = r.ok ? await r.json() : [];
    const boosts: { chainId: string; tokenAddress: string }[] = Array.isArray(list) ? list : (list?.data ?? []);
    // Solana only for v1 (native deep scan), de-dupe, cap the batch.
    const seen = new Set<string>();
    const candidates = boosts
      .filter((b) => b.chainId === "solana" && b.tokenAddress && !seen.has(b.tokenAddress) && seen.add(b.tokenAddress))
      .slice(0, 12);

    const scans = await Promise.all(
      candidates.map(async (c) => {
        const res = await withTimeout(scanToken(c.tokenAddress).catch(() => null), 14000);
        if (!res) return null;
        return isVerified(res.chain, res.mint) ? applyVerified(res) : res;
      })
    );

    let scanned = 0;
    const caught: Caught[] = [];
    for (const s of scans) {
      if (!s) continue;
      scanned++;
      if (RISKY.has(s.verdict) || s.score < 60) {
        caught.push({
          chain: s.chain, mint: s.mint,
          name: s.name || s.symbol || s.mint.slice(0, 6),
          symbol: s.symbol || "",
          verdict: s.verdict, score: s.score,
          reason: topReason(s.checks),
        });
      }
    }
    caught.sort((a, b) => a.score - b.score); // worst first

    return NextResponse.json(
      { scanned, flagged: caught.length, caught: caught.slice(0, 8), updatedAt: Date.now() },
      { headers: { "cache-control": "public, s-maxage=3600, stale-while-revalidate=7200" } }
    );
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "radar failed", scanned: 0, flagged: 0, caught: [] }, { status: 200 });
  }
}
