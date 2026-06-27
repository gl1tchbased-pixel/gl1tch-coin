/**
 * Live market data for $GL1TCH — pulled client-side from free, key-less,
 * CORS-enabled APIs. Single source of truth for any live price/cap/volume
 * display on the site so widgets never drift apart.
 *
 * Primary:  DexScreener  https://api.dexscreener.com/latest/dex/tokens/{mint}
 * Fallback: GeckoTerminal https://api.geckoterminal.com/api/v2/networks/solana/tokens/{mint}/pools
 *
 * DexScreener stopped indexing the GL1TCH pair (low volume), returning 0 pairs
 * and blanking every widget. GeckoTerminal still tracks the same pool, so we
 * fall back to it. Both are no-auth and browser-safe.
 */

import { CONTRACT_ADDRESS } from "@/lib/official";

/** The launch pair (GL1TCH/SOL on Pump.fun) — preferred when multiple pairs exist. */
export const PRIMARY_PAIR = "9fi2sFnnySPhNwJZPzZwxZT3xQnjPa9dh3EQbVNCstRW";

export interface MarketSnapshot {
  priceUsd: number | null;
  priceChange24h: number | null;
  marketCap: number | null;
  liquidityUsd: number | null;
  volume24h: number | null;
  pairAddress: string | null;
  /** DexScreener URL for the resolved pair, for "view chart" deep-links. */
  url: string | null;
}

interface DexPair {
  pairAddress?: string;
  priceUsd?: string;
  marketCap?: number;
  fdv?: number;
  liquidity?: { usd?: number };
  volume?: { h24?: number };
  priceChange?: { h24?: number };
  url?: string;
}

const num = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v)
    ? v
    : typeof v === "string" && v !== "" && Number.isFinite(Number(v))
      ? Number(v)
      : null;

const EMPTY: MarketSnapshot = {
  priceUsd: null,
  priceChange24h: null,
  marketCap: null,
  liquidityUsd: null,
  volume24h: null,
  pairAddress: null,
  url: null,
};

const hasData = (s: MarketSnapshot): boolean =>
  s.priceUsd != null || s.marketCap != null || s.liquidityUsd != null;

/** DexScreener — primary source. Returns null if it has no pair for the token. */
async function fetchFromDexScreener(
  signal?: AbortSignal
): Promise<MarketSnapshot | null> {
  const res = await fetch(
    `https://api.dexscreener.com/latest/dex/tokens/${CONTRACT_ADDRESS}`,
    { signal, headers: { accept: "application/json" } }
  );
  if (!res.ok) return null;
  const data: { pairs?: DexPair[] } = await res.json();
  const pairs = data.pairs ?? [];
  if (pairs.length === 0) return null;

  // Prefer the known launch pair; else the deepest-liquidity pair.
  const pair =
    pairs.find((p) => p.pairAddress === PRIMARY_PAIR) ??
    pairs.reduce((best, p) =>
      (p.liquidity?.usd ?? 0) > (best.liquidity?.usd ?? 0) ? p : best
    );

  return {
    priceUsd: num(pair.priceUsd),
    priceChange24h: num(pair.priceChange?.h24),
    marketCap: num(pair.marketCap) ?? num(pair.fdv),
    liquidityUsd: num(pair.liquidity?.usd),
    volume24h: num(pair.volume?.h24),
    pairAddress: pair.pairAddress ?? PRIMARY_PAIR,
    url: pair.url ?? `https://dexscreener.com/solana/${PRIMARY_PAIR}`,
  };
}

interface GtPoolAttrs {
  address?: string;
  base_token_price_usd?: string;
  market_cap_usd?: string | null;
  fdv_usd?: string | null;
  reserve_in_usd?: string | null;
  volume_usd?: { h24?: string };
  price_change_percentage?: { h24?: string };
}

/** GeckoTerminal — fallback when DexScreener has dropped the pair. */
async function fetchFromGeckoTerminal(
  signal?: AbortSignal
): Promise<MarketSnapshot | null> {
  const res = await fetch(
    `https://api.geckoterminal.com/api/v2/networks/solana/tokens/${CONTRACT_ADDRESS}/pools`,
    { signal, headers: { accept: "application/json" } }
  );
  if (!res.ok) return null;
  const data: { data?: { attributes?: GtPoolAttrs }[] } = await res.json();
  const pools = data.data ?? [];
  if (pools.length === 0) return null;

  // Deepest-reserve pool.
  const a = pools
    .map((p) => p.attributes ?? {})
    .reduce((best, p) =>
      Number(p.reserve_in_usd ?? 0) > Number(best.reserve_in_usd ?? 0) ? p : best
    );
  const addr = a.address ?? PRIMARY_PAIR;

  return {
    priceUsd: num(a.base_token_price_usd),
    priceChange24h: num(a.price_change_percentage?.h24),
    marketCap: num(a.market_cap_usd) ?? num(a.fdv_usd),
    liquidityUsd: num(a.reserve_in_usd),
    volume24h: num(a.volume_usd?.h24),
    pairAddress: addr,
    url: `https://www.geckoterminal.com/solana/pools/${addr}`,
  };
}

/**
 * SERVER-SIDE resolver — tries DexScreener, falls back to GeckoTerminal.
 * Used by the /api/market route. Runs server-to-server so the browser never hits
 * GeckoTerminal directly (it doesn't send CORS headers on rate-limited responses,
 * which blanked the client fetch on data-heavy pages like /live).
 */
export async function resolveMarketSnapshot(
  signal?: AbortSignal
): Promise<MarketSnapshot> {
  if (!CONTRACT_ADDRESS) return EMPTY;
  try {
    const dex = await fetchFromDexScreener(signal).catch(() => null);
    if (dex && hasData(dex)) return dex;
    const gt = await fetchFromGeckoTerminal(signal).catch(() => null);
    if (gt && hasData(gt)) return gt;
    return dex ?? gt ?? EMPTY;
  } catch {
    return EMPTY;
  }
}

/**
 * CLIENT fetch — calls our own same-origin /api/market (no CORS, CDN-cached ~30s),
 * which resolves DexScreener→GeckoTerminal server-side. Returns all-null on failure
 * so callers render a fallback.
 */
export async function fetchMarket(
  signal?: AbortSignal
): Promise<MarketSnapshot> {
  try {
    const res = await fetch("/api/market", {
      signal,
      headers: { accept: "application/json" },
    });
    if (!res.ok) return EMPTY;
    return (await res.json()) as MarketSnapshot;
  } catch {
    return EMPTY;
  }
}

/* ---- Formatters (compact, locale-stable) ---- */

export function fmtUsd(v: number | null): string {
  if (v == null) return "—";
  if (v >= 1_000_000_000) return `$${(v / 1_000_000_000).toFixed(2)}B`;
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
  return `$${v.toFixed(2)}`;
}

/** Unicode subscript digits, for DexScreener-style tiny-price notation. */
const SUBSCRIPT = ["₀", "₁", "₂", "₃", "₄", "₅", "₆", "₇", "₈", "₉"];
const toSubscript = (n: number): string =>
  String(n)
    .split("")
    .map((d) => SUBSCRIPT[Number(d)])
    .join("");
const trimZeros = (s: string): string =>
  s.includes(".") ? s.replace(/0+$/, "").replace(/\.$/, "") : s;

/**
 * Format a USD price. Mirrors how DexScreener renders meme-coin prices:
 * - >= $1: thousands-separated, 2 decimals.
 * - $0.0001–$1: up to 4 significant figures.
 * - < $0.0001: subscript-zero notation, e.g. 0.000002469 -> $0.0₅2469.
 *   This is compact (won't truncate in tickers) and shows full precision —
 *   the old fixed-decimal form lost digits and could render as all-zeros.
 */
export function fmtPrice(v: number | null): string {
  if (v == null) return "—";
  if (v === 0) return "$0";
  if (v >= 1)
    return `$${v.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
  if (v >= 0.0001) return `$${trimZeros(v.toPrecision(4))}`;

  const exp = Math.floor(Math.log10(v));
  let zeros = -exp - 1; // leading zeros after the decimal point
  let sig = Math.round(v / Math.pow(10, exp - 3)); // 4 significant figures
  if (sig >= 10000) {
    sig = Math.round(sig / 10);
    zeros -= 1;
  }
  const sigStr = String(sig).replace(/0+$/, "") || "0";
  return `$0.0${toSubscript(zeros)}${sigStr}`;
}

export function fmtPct(v: number | null): string {
  if (v == null) return "—";
  const s = v.toFixed(2);
  return `${v > 0 ? "+" : ""}${s}%`;
}

export function pctTone(v: number | null): "up" | "down" | "flat" {
  if (v == null || v === 0) return "flat";
  return v > 0 ? "up" : "down";
}
