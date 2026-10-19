import { describe, it, expect } from "vitest";
import { CURBY_STALE_MS, isPulseStale, formatPulseDate } from "./freshness";

const NOW = Date.parse("2026-10-19T12:00:00.000Z");
const hoursAgo = (h: number) => new Date(NOW - h * 3_600_000).toISOString();

describe("CURBy pulse freshness", () => {
  it("uses a 24 hour threshold", () => {
    expect(CURBY_STALE_MS).toBe(86_400_000);
  });

  it("is fresh inside the threshold and stale past it", () => {
    expect(isPulseStale(hoursAgo(23), NOW)).toBe(false);
    expect(isPulseStale(hoursAgo(25), NOW)).toBe(true);
  });

  it("treats a missing or unparseable timestamp as stale, never as live", () => {
    expect(isPulseStale("", NOW)).toBe(true);
    expect(isPulseStale(undefined, NOW)).toBe(true);
    expect(isPulseStale("garbage", NOW)).toBe(true);
  });

  it("tolerates a little clock skew into the future", () => {
    expect(isPulseStale(new Date(NOW + 30_000).toISOString(), NOW)).toBe(false);
  });

  it("flags the round CURBy has been stuck on since August 2025", () => {
    expect(isPulseStale("2025-08-22T19:42:38.156Z", NOW)).toBe(true);
  });

  it("formats the pulse date for labels in UTC", () => {
    expect(formatPulseDate("2025-08-22T19:42:38.156Z")).toBe("22 Aug 2025");
    expect(formatPulseDate("nope")).toBe("unknown date");
  });
});
