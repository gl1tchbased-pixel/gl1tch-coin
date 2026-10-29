import { describe, it, expect } from "vitest";
import { quickCheck, ScanCache } from "./quick";
import { parseSince, radarView, parseBatchInput } from "./handlers";
import type { RadarSweep } from "@/lib/radar";

const BONK = "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263";
const JUP = "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN";

describe("quickCheck", () => {
  const body = {
    mint: BONK,
    chain: "solana",
    symbol: "Bonk",
    verdict: "CAUTION",
    score: 61,
    confidence: 90,
    scannedAt: 1,
    aiVerdict: "narrative that must not reach the quick check",
    checks: [
      { key: "liquidity", label: "Liquidity", status: "warn", value: "$9k", explain: "…" },
      { key: "mint_authority", label: "Mint authority", status: "fail", value: "ACTIVE", explain: "…" },
      { key: "lp_lock", label: "LP lock", status: "pass", value: "100%", explain: "…" },
    ],
    meta: { liquidityUsd: 9000, lpLockedPct: 100, topHolderPct: 40, topRealHolderPct: 12, holderCount: 300, ageDays: 2 },
  };

  it("keeps failures before warnings, drops passes, and prefers the non-pool top holder", () => {
    const q = quickCheck(body, false);
    expect(q.flags).toEqual([
      { key: "mint_authority", status: "fail", value: "ACTIVE" },
      { key: "liquidity", status: "warn", value: "$9k" },
    ]);
    expect(q.topHolderPct).toBe(12);
    expect(q).toMatchObject({ verdict: "CAUTION", score: 61, liquidityUsd: 9000, ageDays: 2, cached: false });
    expect(JSON.stringify(q)).not.toContain("narrative");
  });
});

describe("ScanCache", () => {
  it("serves within the TTL, expires after it, and evicts the oldest past the cap", () => {
    const c = new ScanCache(1000, 2);
    c.set("a", { n: 1 }, 0);
    expect(c.get("a", 999)).toEqual({ n: 1 });
    expect(c.get("a", 1001)).toBeNull();
    c.set("a", { n: 1 }, 0);
    c.set("b", { n: 2 }, 0);
    c.set("c", { n: 3 }, 0);
    expect(c.get("a", 1)).toBeNull();
    expect(c.get("c", 1)).toEqual({ n: 3 });
  });
});

describe("radar since", () => {
  const sweep: RadarSweep = {
    scanned: 3,
    flagged: 1,
    updatedAt: 5000,
    ranked: [
      { chain: "solana", mint: "A", name: "A", symbol: "A", verdict: "HIGH RISK", score: 20, reason: "x", flagged: true, listedAt: 3000 },
      { chain: "solana", mint: "B", name: "B", symbol: "B", verdict: "CLEAN", score: 90, reason: "y", flagged: false, listedAt: 1000 },
      { chain: "solana", mint: "C", name: "C", symbol: "C", verdict: "CAUTION", score: 50, reason: "z", flagged: false, listedAt: null },
    ],
  };

  it("parses ms, scales seconds, and refuses junk", () => {
    expect(parseSince(null)).toBeNull();
    expect(parseSince("")).toBeNull();
    expect(parseSince("1793216000000")).toBe(1793216000000);
    expect(parseSince("1793216000")).toBe(1793216000000);
    expect(parseSince("yesterday")).toBe("bad");
    expect(parseSince("-5")).toBe("bad");
  });

  it("without since returns the whole sweep; with it only tokens listed later; cursor is the newest listing", () => {
    expect(radarView(sweep, null, 5000).tokens.map((t) => t.mint)).toEqual(["A", "B", "C"]);
    const v = radarView(sweep, 2000, 5000);
    expect(v.tokens.map((t) => t.mint)).toEqual(["A"]);
    expect(v.cursor).toBe(3000);
    expect(radarView(sweep, 3000, 5000).tokens).toEqual([]);
    expect(radarView(sweep, 3000, 5000).cursor).toBe(3000);
  });
});

describe("parseBatchInput", () => {
  it("dedupes, keeps order, and caps at ten", () => {
    expect(parseBatchInput(new URLSearchParams({ mints: `${BONK}, ${JUP},${BONK}` }))).toEqual({ mints: [BONK, JUP], chain: "" });
    expect(parseBatchInput(new URLSearchParams({ mints: "" }))).toHaveProperty("error");
    expect(parseBatchInput(new URLSearchParams({ mints: `${BONK},nope` }))).toHaveProperty("error");
    expect(parseBatchInput(new URLSearchParams({ mints: BONK, chain: "moon" }))).toHaveProperty("error");
  });
});
