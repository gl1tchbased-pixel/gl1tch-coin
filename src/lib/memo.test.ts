import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { memo, clearMemo } from "./memo";

describe("memo", () => {
  beforeEach(() => clearMemo());
  afterEach(() => vi.useRealTimers());

  it("serves a fresh value from cache and reloads after the TTL", async () => {
    vi.useFakeTimers();
    const load = vi.fn(async () => Math.random());
    const a = await memo("k", 1000, load);
    expect(await memo("k", 1000, load)).toBe(a);
    expect(load).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1001);
    await memo("k", 1000, load);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("shares one in-flight load between concurrent callers", async () => {
    const load = vi.fn(() => new Promise<number>((r) => setTimeout(() => r(7), 10)));
    const [a, b] = await Promise.all([memo("k", 1000, load), memo("k", 1000, load)]);
    expect([a, b]).toEqual([7, 7]);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("does not cache failures or zero-TTL results", async () => {
    const bad = vi.fn(async () => { throw new Error("x"); });
    await expect(memo("k", 1000, bad)).rejects.toThrow("x");
    await expect(memo("k", 1000, bad)).rejects.toThrow("x");
    expect(bad).toHaveBeenCalledTimes(2);

    const weak = vi.fn(async () => 1);
    await memo("w", () => 0, weak);
    await memo("w", () => 0, weak);
    expect(weak).toHaveBeenCalledTimes(2);
  });
});
