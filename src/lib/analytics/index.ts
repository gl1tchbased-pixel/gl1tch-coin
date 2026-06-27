import type { LiveResult, OnChainMetrics } from "./types";
import { fetchDexscreener } from "./dexscreener";
import { fetchBirdeyeHolders } from "./birdeye";

export type { LiveResult, OnChainMetrics } from "./types";

/** Server-side feature flag. Live data is attempted only when enabled AND a
 *  contract address exists. Set ANALYTICS_LIVE=false to force mock post-launch. */
export function analyticsLive(contractAddress: string): boolean {
  return process.env.ANALYTICS_LIVE !== "false" && contractAddress.length > 0;
}

/** Fetch and combine on-chain metrics. Returns null if no market data is available
 *  (e.g. pre-trading), so callers can fall back to mock cleanly. */
export async function fetchOnChain(mint: string): Promise<LiveResult | null> {
  const [market, holders] = await Promise.all([
    fetchDexscreener(mint),
    fetchBirdeyeHolders(mint),
  ]);
  if (!market) return null;

  const metrics: OnChainMetrics = { ...market, holders };
  return {
    metrics,
    source: holders !== null ? "dexscreener+birdeye" : "dexscreener",
    fetchedAt: new Date().toISOString(),
  };
}

/** Compact USD, e.g. $1.2M, $850K, $0.0042. */
export function formatUsd(n: number | null): string {
  if (n === null) return "—";
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  if (abs >= 1) return `$${n.toFixed(2)}`;
  return `$${n.toPrecision(2)}`;
}

/** Compact integer, e.g. 12,345 or 1.2M. */
export function formatCount(n: number | null): string {
  if (n === null) return "—";
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  return n.toLocaleString("en-US");
}

/** Signed percent, e.g. +4.2% / -1.9%. */
export function formatPct(n: number | null): string {
  if (n === null) return "—";
  return `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
}

export function trendOf(n: number | null): "up" | "down" | "flat" {
  if (n === null || n === 0) return "flat";
  return n > 0 ? "up" : "down";
}
