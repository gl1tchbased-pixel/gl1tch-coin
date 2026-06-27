/** Aggregate discovery — runs all working sources in parallel and ranks.
 *  Reddit and Nitter are NOT used: both actively block server-IP scraping
 *  (Reddit returns 403, Nitter mirrors all moved behind Anubis bot-protection
 *  in 2025). DexScreener token-profiles/token-boosts + CoinGecko trending are
 *  the reliable free alternatives. */

import type { Opportunity } from "../types.js";
import { discoverDexscreener } from "./dexscreener.js";
import { discoverCoinGecko } from "./coingecko.js";

export interface SweepResult {
  opportunities: Opportunity[];
  errors: string[]; // human-readable per-source errors (admin-facing)
  bySource: Record<string, number>;
}

async function runOne<T>(name: string, fn: () => Promise<T[]>): Promise<{ name: string; out: T[]; err?: string }> {
  try {
    const out = await fn();
    return { name, out };
  } catch (e) {
    return { name, out: [] as T[], err: (e as Error).message };
  }
}

/** Sweep all sources, dedupe, return top N + per-source diagnostics. */
export async function sweep(opts: { top?: number } = {}): Promise<SweepResult> {
  const top = opts.top ?? 8;
  const results = await Promise.all([
    runOne("dexscreener", discoverDexscreener),
    runOne("coingecko", discoverCoinGecko),
  ]);

  const all: Opportunity[] = [];
  const bySource: Record<string, number> = {};
  const errors: string[] = [];
  for (const r of results) {
    bySource[r.name] = r.out.length;
    if (r.err) errors.push(`${r.name}: ${r.err}`);
    all.push(...(r.out as Opportunity[]));
  }

  const seen = new Set<string>();
  const deduped = all.filter((o) => {
    if (seen.has(o.id)) return false;
    seen.add(o.id);
    return true;
  });

  // Score floor — low for new-token profiles since they often lack signal text.
  const filtered = deduped.filter((o) => o.score >= 40);
  filtered.sort((a, b) => b.score - a.score);

  return {
    opportunities: filtered.slice(0, top),
    errors,
    bySource,
  };
}
