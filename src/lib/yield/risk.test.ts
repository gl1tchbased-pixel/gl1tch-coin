import { describe, it, expect } from "vitest";
import { riskOf } from "./risk";
import type { YieldOpportunity } from "./types";

const base: YieldOpportunity = {
  id: "ethereum-aave-v3-usdc",
  chain: "ethereum",
  protocol: "aave-v3",
  kind: "lending",
  symbol: "USDC",
  asset: { symbol: "USDC", address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", decimals: 6 },
  receipt: { symbol: "aToken", address: "0x98c23e9d8f34fefb1b7bd6a91b7ff122f4e16f5c" },
  stable: true,
  ilRisk: "none",
  tokens: [],
  method: "rate",
  apy: 0.0459,
  window: "live",
  measuredSinceMs: null,
  tvlUsd: 2_343_400_000,
  idleShare: 0.055,
  feePct: null,
  rate: null,
  inputs: {},
  verify: { rpc: "", body: "", read: "" },
  stale: false,
  updatedAt: 0,
};

describe("riskOf", () => {
  it("rates a deep Aave USDC market low and explains the exit", () => {
    const r = riskOf(base);
    expect(r.level).toBe("low");
    expect(r.reasons.some((x) => /withdraw/i.test(x.text))).toBe(true);
    expect(r.warnings).toEqual([]);
    expect(r.score).toBe(r.reasons.reduce((a, x) => a + x.points, 0));
  });

  it("rates a tiny vault promising 639% as high, with hard warnings", () => {
    const r = riskOf({ ...base, id: "robinhood-morpho-orb", chain: "robinhood", protocol: "morpho", kind: "vault", apy: 6.39, tvlUsd: 11_300, idleShare: null, method: "growth", window: "7d" });
    expect(r.level).toBe("high");
    expect(r.warnings).toContain("Over 100% APY");
    expect(r.warnings).toContain("Under $100K deposited");
  });

  it("warns when the measured value went down", () => {
    const r = riskOf({ ...base, kind: "vault", method: "growth", apy: -0.02, window: "7d", idleShare: null });
    expect(r.warnings).toContain("Value went down over the measured window");
  });

  it("flags a lending market that almost nobody can leave", () => {
    const r = riskOf({ ...base, idleShare: 0.01 });
    expect(r.warnings).toContain("Almost nothing can be withdrawn right now");
  });

  it("counts unknown size and a still-measuring yield", () => {
    const r = riskOf({ ...base, kind: "vault", method: "growth", apy: null, window: null, tvlUsd: null, idleShare: null });
    expect(r.reasons.some((x) => /size/i.test(x.text))).toBe(true);
    expect(r.reasons.some((x) => /measuring/i.test(x.text))).toBe(true);
  });

  it("caps the score at 100", () => {
    const r = riskOf({ ...base, chain: "robinhood", kind: "vault", apy: 9, tvlUsd: null, idleShare: null, stale: true, method: "growth", window: "24h" });
    expect(r.score).toBeLessThanOrEqual(100);
  });
});

describe("riskOf — DEX pools", () => {
  it("counts impermanent loss for an uncorrelated pair, less for a correlated one", () => {
    const dex = { ...base, kind: "dex-lp" as const, ilRisk: "high" as const, idleShare: null, method: "growth" as const, window: "7d" as const, apy: 0.3 };
    const high = riskOf(dex);
    expect(high.reasons.some((r) => /impermanent loss/i.test(r.text))).toBe(true);
    const low = riskOf({ ...dex, ilRisk: "low" });
    expect(low.score).toBeLessThan(high.score);
  });
});
