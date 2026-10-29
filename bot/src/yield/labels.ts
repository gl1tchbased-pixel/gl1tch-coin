import type { YieldChain } from "./registry.js";

/** Plain-text formatting for Yield X-Ray messages in Telegram (the website has its own copy in src/lib/yield). */

export const SITE_YIELD = "https://gl1tchbased.xyz/yield";

const CHAIN: Record<YieldChain, string> = {
  ethereum: "Ethereum",
  base: "Base",
  arbitrum: "Arbitrum",
  bsc: "BNB Chain",
  robinhood: "Robinhood Chain",
  tron: "Tron",
  solana: "Solana",
};

export const chainLabel = (c: YieldChain) => CHAIN[c] ?? c;
export const cardUrl = (id: string) => `${SITE_YIELD}/${id}`;

export function pctText(x: number | null, digits = 2): string {
  return x == null || !Number.isFinite(x) ? "—" : `${(x * 100).toFixed(digits)}%`;
}

export function usdText(x: number | null): string {
  if (x == null || !Number.isFinite(x)) return "—";
  if (x >= 1e9) return `$${(x / 1e9).toFixed(2)}B`;
  if (x >= 1e6) return `$${(x / 1e6).toFixed(1)}M`;
  if (x >= 1e3) return `$${(x / 1e3).toFixed(1)}K`;
  return `$${x.toFixed(2)}`;
}
