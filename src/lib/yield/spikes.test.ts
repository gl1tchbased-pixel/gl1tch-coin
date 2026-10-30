import { describe, expect, it, vi } from "vitest";
import { getYieldSpikesReport } from "./spikes";

vi.mock("./client", () => ({
  getYieldSnapshot: vi.fn().mockResolvedValue({
    updatedAt: 1793399000000,
    opportunities: [
      {
        id: "solana-kamino-usdc",
        chain: "solana",
        protocol: "kamino",
        kind: "lending",
        symbol: "USDC",
        stable: true,
        apy: 8.5,
        tvlUsd: 15_000_000,
        ilRisk: "none",
        idleShare: 0.15,
      },
      {
        id: "ethereum-aave-v3-usdc",
        chain: "ethereum",
        protocol: "aave-v3",
        kind: "lending",
        symbol: "USDC",
        stable: true,
        apy: 3.2,
        tvlUsd: 120_000_000,
        ilRisk: "none",
        idleShare: 0.25,
      },
      {
        id: "solana-orca-sol-usdc",
        chain: "solana",
        protocol: "orca",
        kind: "dex-lp",
        symbol: "SOL-USDC",
        stable: false,
        apy: 38.0,
        tvlUsd: 2_500_000,
        ilRisk: "high",
        idleShare: 0.05,
      },
    ],
  }),
}));

describe("DeFi Yield Spikes & Arbitrage Report", () => {
  it("computes top opportunities, rebalance spreads, and risk alerts", async () => {

    const rep = await getYieldSpikesReport();
    expect(rep).not.toBeNull();
    expect(rep?.ok).toBe(true);
    expect(rep?.count).toBe(3);
    expect(rep?.topOpportunities.length).toBeGreaterThanOrEqual(1);

    // Should detect spread between Ethereum Aave (3.2%) and Solana Kamino (8.5%)
    expect(rep?.rebalanceSpreads.length).toBeGreaterThanOrEqual(1);
    const s = rep?.rebalanceSpreads[0];
    expect(s?.borrowProtocol).toBe("aave-v3");
    expect(s?.supplyProtocol).toBe("kamino");
    expect(s?.netSpreadPct).toBeCloseTo(5.3, 1);

    // Should flag high IL risk in Orca
    expect(rep?.riskAlerts.some((a) => a.id === "solana-orca-sol-usdc")).toBe(true);
  });
});
