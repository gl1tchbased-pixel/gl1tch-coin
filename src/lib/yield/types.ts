/**
 * Yield X-Ray bridge contract (GET {bot}/yield). Mirrors bot/src/yield/types.ts — change both together.
 * APYs are fractions (0.0457 = 4.57%); unknown values are null, never 0.
 */

export type YieldChain = "ethereum" | "base" | "arbitrum" | "bsc" | "robinhood" | "tron" | "solana";
export type YieldKind = "lending" | "liquid-staking" | "vault" | "dex-lp";
/** rate: the protocol's live on-chain rate · epoch: one Solana epoch of pool growth · growth: GL1TCH's own snapshots */
export type ApyMethod = "rate" | "epoch" | "growth";
export type PriceKey = "ETH" | "SOL" | "BTC" | "BNB" | "USDC";

export interface YieldOpportunity {
  id: string;
  chain: YieldChain;
  protocol: string;
  kind: YieldKind;
  symbol: string;
  asset: { symbol: string; address: string; decimals: number };
  receipt: { symbol: string; address: string } | null;
  stable: boolean;
  /** Impermanent-loss exposure: none for single-asset products; DEX pools low (correlated pair) or high. */
  ilRisk: "none" | "low" | "high";
  /** Every token involved, for scanner links. */
  tokens: { symbol: string; address: string }[];
  method: ApyMethod;
  apy: number | null;
  /** DEX pools: fee APR of a passive full-range position (apy is the pool average). */
  fullRangeApr?: number | null;
  window: "live" | "epoch" | "24h" | "7d" | null;
  measuredSinceMs: number | null;
  tvlUsd: number | null;
  idleShare: number | null;
  feePct: number | null;
  rate: string | null;
  inputs: Record<string, string>;
  verify: { rpc: string; body: string; read: string };
  stale: boolean;
  updatedAt: number;
}

export interface YieldSnapshot {
  updatedAt: number;
  opportunities: YieldOpportunity[];
  sources: { id: string; ok: boolean; ms: number; error?: string }[];
  prices: Partial<Record<PriceKey, number>>;
  gas: Partial<Record<YieldChain, { gwei: number; nativeUsd: number | null }>>;
  network: { solanaEpochsPerYear: number | null; solanaInflation: number | null; solanaStakedShare: number | null };
}

export interface YieldPoint {
  t: number;
  apy: number | null;
  tvlUsd: number | null;
  rate: string | null;
  /** DEX pools: cumulative fee counters at this time. */
  aux?: string[];
}
