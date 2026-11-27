/** New Token Reality — shape of the bot's GET /token-reality (bot/src/token-reality/store.ts → RealityView). */

export type RealityChain = "solana" | "ethereum" | "base" | "bsc" | "arbitrum" | "polygon";

export interface Rates {
  n: number;
  stoppedFirstHour: number;
  traded: number;
  halved: number;
  wiped: number;
  upOrFlat: number;
  medianChange72: number | null;
  stoppedShare: number | null;
  halvedShare: number | null;
  halvedCi: [number, number] | null;
  wipedShare: number | null;
  upShare: number | null;
  lostHalfOrMoreShare: number | null;
  lostHalfOrMoreCi: [number, number] | null;
}

export interface ChainReality {
  chain: RealityChain;
  week: Rates & { from: number; to: number };
  all: Rates;
  byDex: { dex: string; n: number; lostHalfOrMoreShare: number | null }[];
  weekly: { weekStart: number; n: number; lostHalfOrMoreShare: number | null; halvedShare: number | null; stoppedShare: number | null }[];
  sampled: number;
  awaiting: number;
  firstResultAt: number | null;
}

export interface RealityView {
  version: 1;
  updatedAt: number;
  startedAt: number | null;
  minSample: number;
  chains: ChainReality[];
}
