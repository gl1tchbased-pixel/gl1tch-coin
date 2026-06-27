/** DexScreener discovery — newly added Solana token profiles + boosted tokens.
 *  These are the closest thing to "trending right now on Solana" and reply targets
 *  for "fellow Solana meme launch" / "audit my token" conversations. */

import type { Opportunity } from "../types.js";
import { scoreOpportunity } from "../scoring.js";

const UA = "Mozilla/5.0 (compatible; GL1TCH-discovery/1.0)";

interface DexProfile {
  chainId: string;
  tokenAddress: string;
  url: string;
  icon?: string;
  description?: string;
  links?: Array<{ label?: string; type?: string; url: string }>;
}

interface DexBoost {
  chainId: string;
  tokenAddress: string;
  url: string;
  amount?: number;
  totalAmount?: number;
  description?: string;
  icon?: string;
}

async function getJson<T>(url: string, signal: AbortSignal): Promise<T> {
  const r = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" }, signal });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return (await r.json()) as T;
}

function profileToOpp(p: DexProfile, idx: number): Opportunity {
  const desc = (p.description ?? "").slice(0, 300);
  const symbol = p.tokenAddress.slice(-6).toUpperCase();
  const raw: Omit<Opportunity, "score"> = {
    id: `dex-profile-${p.tokenAddress}`,
    source: "dexscreener",
    url: p.url,
    author: `Solana · ${symbol}`,
    title: `New Solana token profile · ${desc.slice(0, 60) || "no description"}`,
    excerpt: desc || "Newly added on DexScreener — no description provided.",
    metrics: { ageHours: idx, engagement: 1, relevance: 1 },
  };
  return { ...raw, score: scoreOpportunity(raw) };
}

function boostToOpp(b: DexBoost): Opportunity {
  const desc = (b.description ?? "").slice(0, 300);
  const symbol = b.tokenAddress.slice(-6).toUpperCase();
  const totalBoost = b.totalAmount ?? b.amount ?? 0;
  const raw: Omit<Opportunity, "score"> = {
    id: `dex-boost-${b.tokenAddress}`,
    source: "dexscreener",
    url: b.url,
    author: `Solana · ${symbol} (boosted)`,
    title: `Boosted Solana token · ${desc.slice(0, 60) || "active campaign"}`,
    excerpt: `${desc || "Active DexScreener boost — owner paying for visibility."}\n[Boost total: ${totalBoost}]`,
    metrics: { ageHours: 1, engagement: totalBoost, relevance: 1 },
  };
  // Slight boost: paid campaigns mean a real owner = real audience to reach.
  return { ...raw, score: Math.min(100, scoreOpportunity(raw) + 5) };
}

export async function discoverDexscreener(opts: { timeoutMs?: number } = {}): Promise<Opportunity[]> {
  const timeoutMs = opts.timeoutMs ?? 8000;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const [profiles, boosts] = await Promise.all([
      getJson<DexProfile[]>(
        "https://api.dexscreener.com/token-profiles/latest/v1",
        ctrl.signal,
      ).catch(() => [] as DexProfile[]),
      getJson<DexBoost[]>(
        "https://api.dexscreener.com/token-boosts/latest/v1",
        ctrl.signal,
      ).catch(() => [] as DexBoost[]),
    ]);

    const solProfiles = profiles.filter((p) => p.chainId === "solana");
    const solBoosts = boosts.filter((p) => p.chainId === "solana");

    const opps: Opportunity[] = [];
    solProfiles.slice(0, 10).forEach((p, i) => opps.push(profileToOpp(p, i)));
    solBoosts.slice(0, 10).forEach((b) => opps.push(boostToOpp(b)));

    // Dedupe by token address
    const seen = new Set<string>();
    const deduped = opps.filter((o) => {
      if (seen.has(o.id)) return false;
      seen.add(o.id);
      return true;
    });

    return deduped.sort((a, b) => b.score - a.score);
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}
