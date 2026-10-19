import { describe, it, expect } from "vitest";
import { isStale, ageLabel } from "./staleness";

const NOW = Date.parse("2026-10-19T12:00:00Z");

describe("staleness rule (a card is stale past 2x its refresh interval)", () => {
  it("is fresh within twice the interval", () => {
    expect(isStale(NOW - 59_000, 30_000, NOW)).toBe(false);
  });
  it("is stale beyond twice the interval", () => {
    expect(isStale(NOW - 61_000, 30_000, NOW)).toBe(true);
  });
  it("treats missing or invalid timestamps as stale", () => {
    expect(isStale(undefined, 30_000, NOW)).toBe(true);
    expect(isStale(NaN, 30_000, NOW)).toBe(true);
  });
  it("labels ages for people", () => {
    expect(ageLabel(NOW - 20_000, NOW)).toBe("just now");
    expect(ageLabel(NOW - 5 * 60_000, NOW)).toBe("5 min ago");
    expect(ageLabel(NOW - 3 * 3_600_000, NOW)).toBe("3 h ago");
    expect(ageLabel(NOW - 3 * 86_400_000, NOW)).toBe("3 d ago");
  });
});
