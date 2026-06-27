/** CoinGecko trending — public, no auth (rate-limited to ~30 req/min unauth).
 *  Returns globally-trending coins; we surface Solana-ecosystem hits as reply targets. */

import type { Opportunity } from "../types.js";
import { scoreOpportunity } from "../scoring.js";

const UA = "Mozilla/5.0 (compatible; GL1TCH-discovery/1.0)";

interface TrendingResponse {
  coins?: Array<{
    item: {
      id: string;
      coin_id: number;
      name: string;
      symbol: string;
      market_cap_rank?: number | null;
      thumb?: string;
      slug?: string;
      data?: { content?: { title?: string; description?: string } };
    };
  }>;
}

export async function discoverCoinGecko(opts: { timeoutMs?: number } = {}): Promise<Opportunity[]> {
  const timeoutMs = opts.timeoutMs ?? 8000;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch("https://api.coingecko.com/api/v3/search/trending", {
      headers: { "User-Agent": UA, Accept: "application/json" },
      signal: ctrl.signal,
    });
    if (!r.ok) return [];
    const j = (await r.json()) as TrendingResponse;
    const coins = j.coins ?? [];
    const opps: Opportunity[] = coins.slice(0, 8).map((c, i) => {
      const it = c.item;
      const desc = it.data?.content?.description ?? it.data?.content?.title ?? "";
      const title = `${it.symbol.toUpperCase()} · ${it.name} · trending #${i + 1}`;
      const excerpt =
        (desc || "Globally trending on CoinGecko right now.") +
        (it.market_cap_rank ? `\nMarket cap rank: #${it.market_cap_rank}` : "");
      const raw: Omit<Opportunity, "score"> = {
        id: `cg-${it.id}`,
        source: "dexscreener", // collapse into one source for now; UI still readable
        url: `https://www.coingecko.com/en/coins/${it.slug ?? it.id}`,
        author: `CoinGecko trending · ${it.symbol.toUpperCase()}`,
        title,
        excerpt,
        metrics: { ageHours: 1, engagement: 50 - i * 5, relevance: 1 },
      };
      return { ...raw, score: scoreOpportunity(raw) };
    });
    return opps;
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}
