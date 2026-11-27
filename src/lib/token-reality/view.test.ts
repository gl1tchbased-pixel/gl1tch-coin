import { describe, expect, it } from "vitest";
import { collectingNote, dexLabel, headline, publishable, realityApiResponse, realityChainOf, realityText, pct, signedPct } from "./view";
import { isRealityView } from "./client";
import { isYoungAge } from "@/components/web3/NewTokenRealityLine";
import { NOW, REALITY } from "./fixture.test-data";

const get = (c: string) => REALITY.chains.find((x) => x.chain === c)!;

describe("publishing rules", () => {
  it("prefers the last 7 days, falls back to all data, and publishes nothing below the minimum", () => {
    expect(publishable(get("solana"), 30)?.window).toBe("week");
    expect(publishable(get("base"), 30)?.window).toBe("all");
    expect(publishable(get("arbitrum"), 30)).toBeNull();
  });

  it("writes one honest sentence with the sample size, or nothing", () => {
    expect(headline(get("solana"), 30)).toBe(
      "81% of new Solana tokens launched in the last week we can fully measure either stopped trading within an hour or lost at least half their value within three days (sample of 80)."
    );
    expect(headline(get("arbitrum"), 30)).toBeNull();
  });

  it("explains why a chain is still collecting", () => {
    expect(collectingNote(get("polygon"), 30, NOW)).toMatch(/3 tokens sampled; the first 3-day results are due/);
    expect(collectingNote(get("arbitrum"), 30, NOW)).toBe("4 of 30 measured launches needed before a number is published (5 more waiting for their 3 days).");
    expect(collectingNote(get("bsc"), 30, NOW)).toMatch(/not found a brand-new token/);
  });
});

describe("formatting and mapping", () => {
  it("formats shares and signed changes", () => {
    expect(pct(0.8125)).toBe("81%");
    expect(pct(null)).toBe("—");
    expect(signedPct(-0.62)).toBe("−62%");
    expect(signedPct(0.1)).toBe("+10%");
  });

  it("maps scanner chains and labels DEX ids", () => {
    expect(realityChainOf("base")).toBe("base");
    expect(realityChainOf("eth")).toBe("ethereum");
    expect(realityChainOf("tron")).toBeNull();
    expect(dexLabel("uniswap-v4-base")).toBe("Uniswap V4");
    expect(dexLabel("pump-fun")).toBe("Pump Fun");
    expect(dexLabel("four-meme")).toBe("Four Meme");
  });

  it("shows the scan line only for tokens under three days old", () => {
    expect(isYoungAge("< 24 hours")).toBe(true);
    expect(isYoungAge("2 days")).toBe(true);
    expect(isYoungAge("3 days")).toBe(false);
    expect(isYoungAge("—")).toBe(false);
    expect(isYoungAge(undefined)).toBe(false);
  });
});

describe("API and MCP text", () => {
  const q = (s: string) => new URLSearchParams(s);

  it("validates the chain and answers 503 without data", () => {
    expect(realityApiResponse(REALITY, q("chain=tron")).status).toBe(400);
    expect(realityApiResponse(null, q("")).status).toBe(503);
  });

  it("returns published numbers only when the sample is big enough", () => {
    const sol = realityApiResponse(REALITY, q("chain=solana"));
    expect(sol.status).toBe(200);
    expect(sol.body.published).toMatchObject({ window: "week", n: 80, lostHalfOrMoreShare: 0.8125 });
    expect(sol.body.priceData).toBe("GeckoTerminal");
    const arb = realityApiResponse(REALITY, q("chain=arbitrum"));
    expect(arb.body.published).toBeNull();
    expect(arb.body.headline).toBeNull();
    expect((realityApiResponse(REALITY, q("")).body.chains as unknown[]).length).toBe(5);
  });

  it("MCP text gives the numbers with a not-a-prediction note, or says it is still collecting", () => {
    const t = realityText(REALITY, "solana");
    expect(t).toContain("Stopped trading within the first hour: 38%");
    expect(t).toContain("not a prediction");
    expect(realityText(REALITY, "arbitrum")).toMatch(/not enough measured launches yet/);
    expect(realityText(null, "base")).toMatch(/not available/);
  });

  it("validates the bot's shape", () => {
    expect(isRealityView(REALITY)).toBe(true);
    expect(isRealityView({ ...REALITY, version: 2 })).toBe(false);
    expect(isRealityView({ ...REALITY, chains: [{ chain: "base" }] })).toBe(false);
  });
});
