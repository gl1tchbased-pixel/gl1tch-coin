import type { OnChainMetrics } from "./types";

const ENDPOINT = "https://api.dexscreener.com/latest/dex/tokens";

interface DexPair {
  chainId?: string;
  priceUsd?: string;
  fdv?: number;
  marketCap?: number;
  liquidity?: { usd?: number };
  volume?: { h24?: number };
  priceChange?: { h24?: number };
  txns?: { h24?: { buys?: number; sells?: number } };
}

function num(v: unknown): number | null {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) ? n : null;
}

/** Pure: pick the deepest-liquidity Solana pair and map it to on-chain metrics.
 *  Returns null when there is no usable Solana pair. */
export function parseDexscreener(
  json: unknown
): Pick<
  OnChainMetrics,
  "priceUsd" | "marketCapUsd" | "liquidityUsd" | "volume24hUsd" | "priceChange24h" | "txns24h"
> | null {
  const pairs = (json as { pairs?: DexPair[] } | null)?.pairs;
  if (!Array.isArray(pairs) || pairs.length === 0) return null;

  const solana = pairs.filter((p) => p.chainId === "solana");
  const pool = (solana.length > 0 ? solana : pairs).reduce((best, p) =>
    (p.liquidity?.usd ?? 0) > (best.liquidity?.usd ?? 0) ? p : best
  );

  const txns = pool.txns?.h24;
  const txCount =
    txns && (num(txns.buys) !== null || num(txns.sells) !== null)
      ? (num(txns.buys) ?? 0) + (num(txns.sells) ?? 0)
      : null;

  return {
    priceUsd: num(pool.priceUsd),
    marketCapUsd: num(pool.marketCap) ?? num(pool.fdv),
    liquidityUsd: num(pool.liquidity?.usd),
    volume24hUsd: num(pool.volume?.h24),
    priceChange24h: num(pool.priceChange?.h24),
    txns24h: txCount,
  };
}

/** Fetch market data from DEXScreener (no API key). Cached for 60s; null on failure. */
export async function fetchDexscreener(mint: string) {
  try {
    const res = await fetch(`${ENDPOINT}/${mint}`, {
      next: { revalidate: 60 },
      headers: { accept: "application/json" },
    });
    if (!res.ok) return null;
    return parseDexscreener(await res.json());
  } catch {
    return null;
  }
}
