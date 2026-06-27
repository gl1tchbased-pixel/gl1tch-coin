import { describe, it, expect } from "vitest";
import { tokensForLiquidity, toRaw, initialPriceInSol, fdvInSol } from "./poolMath.js";

describe("tokensForLiquidity", () => {
  it("computes the public share of total supply", () => {
    expect(tokensForLiquidity(1_000_000_000, 50)).toBe(500_000_000);
    expect(tokensForLiquidity(1_000_000_000, 0)).toBe(0);
    expect(tokensForLiquidity(1_000_000_000, 100)).toBe(1_000_000_000);
  });

  it("rejects out-of-range percentages", () => {
    expect(() => tokensForLiquidity(1, -1)).toThrow();
    expect(() => tokensForLiquidity(1, 101)).toThrow();
  });
});

describe("toRaw", () => {
  it("scales by decimals without float drift on large supplies", () => {
    expect(toRaw(500_000_000, 6)).toBe(500_000_000_000_000n);
    expect(toRaw(1, 9)).toBe(1_000_000_000n);
    expect(toRaw(0, 6)).toBe(0n);
  });

  it("floors sub-unit fractions", () => {
    expect(toRaw(1.2345678, 6)).toBe(1_234_567n);
    expect(toRaw(0.5, 2)).toBe(50n);
  });

  it("rejects invalid input", () => {
    expect(() => toRaw(-1, 6)).toThrow();
    expect(() => toRaw(1, -1)).toThrow();
    expect(() => toRaw(1, 1.5)).toThrow();
  });
});

describe("initialPriceInSol / fdvInSol", () => {
  it("derives opening price from pool reserves", () => {
    // 500M tokens paired with 50 SOL -> 0.0000001 SOL per token
    expect(initialPriceInSol(500_000_000, 50)).toBeCloseTo(1e-7, 15);
  });

  it("computes FDV from price and supply", () => {
    expect(fdvInSol(500_000_000, 50, 1_000_000_000)).toBeCloseTo(100, 6);
  });

  it("rejects a non-positive token amount", () => {
    expect(() => initialPriceInSol(0, 50)).toThrow();
  });
});
