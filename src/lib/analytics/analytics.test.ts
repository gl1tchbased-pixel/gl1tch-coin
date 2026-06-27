import { describe, it, expect } from "vitest";
import { parseDexscreener } from "./dexscreener";
import { formatUsd, formatCount, formatPct, trendOf } from "./index";

describe("parseDexscreener", () => {
  it("returns null when there are no pairs", () => {
    expect(parseDexscreener({ pairs: [] })).toBeNull();
    expect(parseDexscreener({})).toBeNull();
    expect(parseDexscreener(null)).toBeNull();
  });

  it("picks the deepest-liquidity Solana pair and maps fields", () => {
    const json = {
      pairs: [
        {
          chainId: "solana",
          priceUsd: "0.0042",
          marketCap: 4_200_000,
          fdv: 5_000_000,
          liquidity: { usd: 120_000 },
          volume: { h24: 880_000 },
          priceChange: { h24: 12.5 },
          txns: { h24: { buys: 300, sells: 200 } },
        },
        {
          chainId: "solana",
          priceUsd: "0.0041",
          liquidity: { usd: 999_999 }, // deeper, but no marketCap
          volume: { h24: 10 },
          marketCap: 4_100_000,
        },
      ],
    };
    const r = parseDexscreener(json)!;
    expect(r.liquidityUsd).toBe(999_999); // deepest pool chosen
    expect(r.marketCapUsd).toBe(4_100_000);
    expect(r.volume24hUsd).toBe(10);
  });

  it("ignores non-Solana pairs when a Solana pair exists", () => {
    const json = {
      pairs: [
        { chainId: "ethereum", liquidity: { usd: 5_000_000 }, marketCap: 9 },
        { chainId: "solana", liquidity: { usd: 1_000 }, marketCap: 7, priceUsd: "1" },
      ],
    };
    expect(parseDexscreener(json)!.marketCapUsd).toBe(7);
  });

  it("falls back to fdv when marketCap is absent and sums txns", () => {
    const json = {
      pairs: [
        {
          chainId: "solana",
          fdv: 3_000_000,
          liquidity: { usd: 50_000 },
          txns: { h24: { buys: 12, sells: 8 } },
        },
      ],
    };
    const r = parseDexscreener(json)!;
    expect(r.marketCapUsd).toBe(3_000_000);
    expect(r.txns24h).toBe(20);
  });

  it("reports null txns when the data is missing", () => {
    const r = parseDexscreener({ pairs: [{ chainId: "solana", liquidity: { usd: 1 } }] })!;
    expect(r.txns24h).toBeNull();
    expect(r.priceUsd).toBeNull();
  });
});

describe("format helpers", () => {
  it("formatUsd compacts magnitudes and handles null", () => {
    expect(formatUsd(null)).toBe("—");
    expect(formatUsd(2_500_000_000)).toBe("$2.50B");
    expect(formatUsd(1_500_000)).toBe("$1.50M");
    expect(formatUsd(850_000)).toBe("$850.0K");
    expect(formatUsd(2.5)).toBe("$2.50");
  });

  it("formatCount compacts and handles null", () => {
    expect(formatCount(null)).toBe("—");
    expect(formatCount(12_345)).toBe("12,345");
    expect(formatCount(1_200_000)).toBe("1.20M");
  });

  it("formatPct signs the value", () => {
    expect(formatPct(null)).toBe("—");
    expect(formatPct(4.23)).toBe("+4.2%");
    expect(formatPct(-1.9)).toBe("-1.9%");
  });

  it("trendOf maps sign to direction", () => {
    expect(trendOf(null)).toBe("flat");
    expect(trendOf(0)).toBe("flat");
    expect(trendOf(3)).toBe("up");
    expect(trendOf(-3)).toBe("down");
  });
});
