import type { ChainReality, Rates, RealityView } from "./types";

/** Shared New Token Reality test data (not a test file itself). */
export const NOW = Date.UTC(2026, 11, 10);
const rates = (over: Partial<Rates> = {}): Rates => ({
  n: 0, stoppedFirstHour: 0, traded: 0, halved: 0, wiped: 0, upOrFlat: 0, medianChange72: null, stoppedShare: null, halvedShare: null,
  halvedCi: null, wipedShare: null, upShare: null, lostHalfOrMoreShare: null, lostHalfOrMoreCi: null, ...over,
});
const chain = (c: ChainReality["chain"], week: Partial<Rates>, all: Partial<Rates>, extra: Partial<ChainReality> = {}): ChainReality => ({
  chain: c, week: { ...rates(week), from: NOW - 10 * 86_400_000, to: NOW - 3 * 86_400_000 }, all: rates(all), byDex: [], weekly: [], sampled: 0, awaiting: 0, firstResultAt: null, ...extra,
});

export const REALITY: RealityView = {
  version: 1,
  updatedAt: NOW,
  startedAt: NOW - 20 * 86_400_000,
  minSample: 30,
  chains: [
    chain("solana", { n: 80, stoppedFirstHour: 30, traded: 50, halved: 35, stoppedShare: 0.375, halvedShare: 0.7, wipedShare: 0.4, upShare: 0.2, medianChange72: -0.62, lostHalfOrMoreShare: 0.8125, lostHalfOrMoreCi: [0.71, 0.88] }, { n: 200 }, { sampled: 240, byDex: [{ dex: "pump-fun", n: 70, lostHalfOrMoreShare: 0.8 }] }),
    chain("base", { n: 12 }, { n: 41, lostHalfOrMoreShare: 0.6 }, { sampled: 50 }),
    chain("arbitrum", { n: 2 }, { n: 4 }, { sampled: 9, awaiting: 5 }),
    chain("polygon", {}, {}, { sampled: 3, awaiting: 3, firstResultAt: NOW + 2 * 86_400_000 }),
    chain("bsc", {}, {}, {}),
  ],
};
