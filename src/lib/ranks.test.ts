import { describe, it, expect } from "vitest";
import {
  RANK_TIERS,
  rankForBalance,
  nextTier,
  formatAmount,
} from "./ranks";

describe("RANK_TIERS", () => {
  it("has five tiers in ascending order with unique tier numbers 1..5", () => {
    expect(RANK_TIERS).toHaveLength(5);
    const mins = RANK_TIERS.map((t) => t.min);
    const sorted = [...mins].sort((a, b) => a - b);
    expect(mins).toEqual(sorted);
    expect(RANK_TIERS.map((t) => t.tier)).toEqual([1, 2, 3, 4, 5]);
    expect(new Set(RANK_TIERS.map((t) => t.id)).size).toBe(5);
  });

  it("starts at zero (Observer requires no holding)", () => {
    expect(RANK_TIERS[0].min).toBe(0);
    expect(RANK_TIERS[0].rank).toBe("Observer");
  });
});

describe("rankForBalance", () => {
  it("returns Observer for zero balance", () => {
    expect(rankForBalance(0).id).toBe("observer");
  });

  it("returns Observer just below the first paid threshold", () => {
    expect(rankForBalance(99_999).id).toBe("observer");
  });

  it("resolves each tier exactly at its threshold", () => {
    expect(rankForBalance(100_000).id).toBe("infected");
    expect(rankForBalance(1_000_000).id).toBe("bearer");
    expect(rankForBalance(5_000_000).id).toBe("core");
    expect(rankForBalance(10_000_000).id).toBe("ghost");
  });

  it("stays in the highest tier above the top threshold", () => {
    expect(rankForBalance(999_999_999).id).toBe("ghost");
  });

  it("rounds down to the highest threshold not exceeded", () => {
    expect(rankForBalance(4_999_999).id).toBe("bearer");
  });
});

describe("nextTier", () => {
  it("points each tier to the one above it", () => {
    expect(nextTier(RANK_TIERS[0])?.id).toBe("infected");
    expect(nextTier(RANK_TIERS[3])?.id).toBe("ghost");
  });

  it("returns null at the top tier", () => {
    expect(nextTier(RANK_TIERS[4])).toBeNull();
  });
});

describe("formatAmount", () => {
  it("groups thousands with separators", () => {
    expect(formatAmount(1_000_000)).toBe("1,000,000");
    expect(formatAmount(0)).toBe("0");
  });
});
