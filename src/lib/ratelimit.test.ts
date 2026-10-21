import { afterEach, describe, expect, it, vi } from "vitest";
import { bucketCount, rateLimit, sweepBuckets } from "./ratelimit";

afterEach(() => {
  vi.useRealTimers();
});

describe("rateLimit", () => {
  it("blocks past the limit and lets the key back in after the window", () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);
    for (let i = 0; i < 3; i++) expect(rateLimit("t:a", 3, 60_000).ok).toBe(true);
    expect(rateLimit("t:a", 3, 60_000).ok).toBe(false);
    vi.setSystemTime(1_060_001);
    expect(rateLimit("t:a", 3, 60_000).ok).toBe(true);
  });
});

describe("sweepBuckets", () => {
  it("caps the map under a flood of distinct IPs, throttles itself, and clears expired buckets", () => {
    vi.useFakeTimers();
    vi.setSystemTime(2_000_000);
    for (let i = 0; i < 60_000; i++) rateLimit(`flood:${i}`, 30, 60_000);
    sweepBuckets();
    expect(bucketCount()).toBeLessThanOrEqual(50_000);

    // A second sweep inside the gap is a no-op, so a flood can't make every request scan the map.
    vi.setSystemTime(2_001_000);
    for (let i = 0; i < 10_000; i++) rateLimit(`flood2:${i}`, 30, 60_000);
    sweepBuckets();
    expect(bucketCount()).toBeGreaterThan(50_000);

    vi.setSystemTime(2_000_000 + 120_000);
    sweepBuckets();
    expect(bucketCount()).toBe(0);
  });
});
