/** Live on-chain market metrics. Any field may be null when a source can't supply it. */
export interface OnChainMetrics {
  priceUsd: number | null;
  marketCapUsd: number | null;
  liquidityUsd: number | null;
  volume24hUsd: number | null;
  priceChange24h: number | null; // percent
  txns24h: number | null;
  holders: number | null;
}

export interface LiveResult {
  metrics: OnChainMetrics;
  source: string; // e.g. "dexscreener" or "dexscreener+birdeye"
  fetchedAt: string; // ISO timestamp
}
