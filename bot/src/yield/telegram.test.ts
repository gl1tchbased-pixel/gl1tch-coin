import { describe, it, expect } from "vitest";
import { searchYield, formatYieldLine, parseYieldPayload, summaryText } from "./telegram.js";
import type { YieldOpportunity, YieldSnapshot } from "./types.js";

const o = (id: string, over: Partial<YieldOpportunity>): YieldOpportunity => ({
  id, chain: "base", protocol: "aave-v3", kind: "lending", symbol: "USDC",
  asset: { symbol: "USDC", address: "0x", decimals: 6 }, receipt: null, stable: true, ilRisk: "none", tokens: [],
  method: "rate", apy: 0.05, window: "live", measuredSinceMs: null, tvlUsd: 100e6, idleShare: 0.1, feePct: null,
  rate: null, inputs: {}, verify: { rpc: "", body: "", read: "" }, stale: false, updatedAt: 0, ...over,
});
const snap = {
  updatedAt: 0,
  opportunities: [
    o("base-aave-v3-usdc", {}),
    o("ethereum-aave-v3-usdc", { chain: "ethereum", tvlUsd: 2e9, apy: 0.046 }),
    o("solana-jito-jitosol", { chain: "solana", protocol: "jito", kind: "liquid-staking", symbol: "JitoSOL", stable: false, apy: 0.049, window: "epoch", tvlUsd: 1e9 }),
    o("ethereum-lido-wsteth", { chain: "ethereum", protocol: "lido", kind: "liquid-staking", symbol: "wstETH", stable: false, apy: null, window: null }),
    o("solana-orca-sol-usdc", { chain: "solana", protocol: "orca", kind: "dex-lp", symbol: "SOL-USDC", stable: false, ilRisk: "high", apy: 0.6, window: "24h" }),
  ],
} as unknown as YieldSnapshot;

describe("searchYield", () => {
  it("matches symbol, chain and protocol words, largest first", () => {
    expect(searchYield(snap, "usdc").map((x) => x.id)).toEqual(["ethereum-aave-v3-usdc", "base-aave-v3-usdc", "solana-orca-sol-usdc"]);
    expect(searchYield(snap, "solana").every((x) => x.chain === "solana")).toBe(true);
    expect(searchYield(snap, "aave base").map((x) => x.id)).toEqual(["base-aave-v3-usdc"]);
    expect(searchYield(snap, "  ")).toEqual([]);
    expect(searchYield(null, "usdc")).toEqual([]);
  });
});

describe("formatYieldLine", () => {
  it("shows APY, chain and the card link; says measuring when there is no APY yet", () => {
    const line = formatYieldLine(snap.opportunities[0]);
    expect(line).toContain("5.00%");
    expect(line).toContain("Base");
    expect(line).toContain("https://gl1tchbased.xyz/yield/base-aave-v3-usdc");
    expect(formatYieldLine(snap.opportunities[3])).toContain("measuring");
    expect(formatYieldLine(snap.opportunities[4])).toContain("fee APR");
  });
});

describe("parseYieldPayload", () => {
  it("reads only yield deep links with a valid id", () => {
    expect(parseYieldPayload("yield_base-aave-v3-usdc")).toBe("base-aave-v3-usdc");
    expect(parseYieldPayload("ref_12345")).toBeNull();
    expect(parseYieldPayload("yield_../x")).toBeNull();
    expect(parseYieldPayload("")).toBeNull();
  });
});

describe("summaryText", () => {
  it("gives ranges per group and no 'best' wording", () => {
    const t = summaryText(snap);
    expect(t).toMatch(/Stablecoin lending.*4\.60%.*5\.00%/s);
    expect(t).toContain("/yield usdc");
    expect(t.toLowerCase()).not.toContain("best");
  });
});
