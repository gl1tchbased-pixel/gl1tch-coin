import { describe, it, expect } from "vitest";
import { toRow, displayName, scanLinks, telegramLink, shareText } from "./view";
import type { YieldOpportunity } from "./types";

const vault = {
  id: "robinhood-morpho-steakusdg",
  chain: "robinhood",
  protocol: "morpho",
  kind: "vault",
  symbol: "steakUSDG",
  asset: { symbol: "USDG", address: "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168", decimals: 6 },
  receipt: { symbol: "steakUSDG", address: "0xBeEff033F34C046626B8D0A041844C5d1A5409dd" },
  stable: true,
  ilRisk: "none",
  tokens: [
    { symbol: "USDG", address: "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168" },
    { symbol: "steakUSDG", address: "0xBeEff033F34C046626B8D0A041844C5d1A5409dd" },
  ],
  method: "growth",
  apy: null,
  window: null,
  measuredSinceMs: 1,
  tvlUsd: 541e6,
  idleShare: null,
  feePct: null,
  rate: "1.0116",
  inputs: {},
  verify: { rpc: "", body: "", read: "" },
  stale: false,
  updatedAt: 1,
} as YieldOpportunity;

describe("yield view helpers", () => {
  it("names curated vaults and labels the row", () => {
    expect(displayName(vault)).toBe("Steakhouse USDG");
    const r = toRow(vault);
    expect(r).toMatchObject({ name: "Steakhouse USDG", protocolName: "Morpho vault", chainLabel: "Robinhood Chain", kindLabel: "Vault" });
    expect(r.riskScore).toBeGreaterThan(0);
  });

  it("links the deposit and receipt tokens to the scanner, skipping native coins", () => {
    expect(scanLinks(vault).map((l) => l.href)).toEqual([
      "/scan?t=robinhood:0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168",
      "/scan?t=robinhood:0xBeEff033F34C046626B8D0A041844C5d1A5409dd",
    ]);
    const lst = { ...vault, chain: "solana", tokens: [{ symbol: "JitoSOL", address: "J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn" }] } as YieldOpportunity;
    expect(scanLinks(lst)).toEqual([{ label: "Scan JitoSOL", href: "/scan?t=solana:J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn" }]);
  });
});

describe("buttons", () => {
  it("builds the Telegram deep link and skips scanning on Tron (the scanner can't read it)", () => {
    expect(telegramLink("base-aave-v3-usdc")).toBe("https://t.me/gl1tch_infected_bot?start=yield_base-aave-v3-usdc");
    expect(scanLinks({ ...vault, chain: "tron", tokens: [{ symbol: "USDT", address: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t" }] } as YieldOpportunity)).toEqual([]);
  });

  it("writes a share text with the number and the name", () => {
    const t = shareText({ ...vault, apy: 0.037 } as YieldOpportunity);
    expect(t).toContain("3.70%");
    expect(t).toContain("Steakhouse USDG");
  });
});
