import type { YieldChain } from "./registry.js";

/**
 * The bridge contract for Yield X-Ray (GET /yield). Mirrored by the website in src/lib/yield/types.ts —
 * change both together. APYs are fractions; unknown values are null, never 0.
 */

export type YieldKind = "lending" | "liquid-staking" | "vault";
/** rate: the protocol's live on-chain rate · epoch: one Solana epoch of pool growth · growth: GL1TCH's own snapshots */
export type ApyMethod = "rate" | "epoch" | "growth";
export type PriceKey = "ETH" | "SOL" | "BTC" | "BNB" | "USDC";

export interface YieldOpportunity {
  id: string;
  chain: YieldChain;
  protocol: string;
  kind: YieldKind;
  symbol: string;
  /** What you deposit; address "native" for a chain's own coin. */
  asset: { symbol: string; address: string; decimals: number };
  /** What you hold afterwards (aToken, LST mint, vault share). */
  receipt: { symbol: string; address: string } | null;
  stable: boolean;
  method: ApyMethod;
  apy: number | null;
  window: "live" | "epoch" | "24h" | "7d" | null;
  /** First time GL1TCH recorded this opportunity (growth method only). */
  measuredSinceMs: number | null;
  tvlUsd: number | null;
  /** Lending: share of deposits that can leave right now. */
  idleShare: number | null;
  /** Pool manager / vault fee as a fraction, when the contract states one. */
  feePct: number | null;
  /** Exchange rate (underlying per share) as a decimal string, for growth/epoch methods. */
  rate: string | null;
  /** The raw on-chain values the APY was derived from. */
  inputs: Record<string, string>;
  /** A JSON-RPC request anyone can send to re-read the main input. */
  verify: { rpc: string; body: string; read: string };
  /** True when this row is carried over from an earlier run because its source failed. */
  stale: boolean;
  updatedAt: number;
}

export type Prices = Partial<Record<PriceKey, number>>;
export type Gas = Partial<Record<YieldChain, { gwei: number; nativeUsd: number | null }>>;
export interface SolanaNetwork {
  solanaEpochsPerYear: number | null;
  solanaInflation: number | null;
  solanaStakedShare: number | null;
}

export interface YieldSnapshot {
  updatedAt: number;
  opportunities: YieldOpportunity[];
  sources: { id: string; ok: boolean; ms: number; error?: string }[];
  prices: Prices;
  gas: Gas;
  network: SolanaNetwork;
}
