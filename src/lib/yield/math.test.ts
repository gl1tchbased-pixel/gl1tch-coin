import { describe, it, expect } from "vitest";
import { projectValue, scenario, impermanentLoss, lpVsHold, breakEvenDays, gasCostUsd, ENTRY_EXIT_GAS } from "./math";

describe("yield calculators", () => {
  it("compounds a value over days", () => {
    expect(projectValue(1000, 0.0493, 365)).toBeCloseTo(1049.3, 6);
    expect(projectValue(1000, 0, 100)).toBe(1000);
  });

  it("puts price moves next to the yield (JitoSOL, SOL −30%)", () => {
    const s = scenario({ amount: 1000, apy: 0.0493, days: 365, priceChange: -0.3, stable: false });
    expect(s.withYield).toBeCloseTo(734.51, 2);
    expect(s.holdOnly).toBeCloseTo(700, 6);
    expect(s.yieldUsd).toBeCloseTo(34.51, 2);
  });

  it("ignores price moves for stablecoins", () => {
    const s = scenario({ amount: 200, apy: 0.0467, days: 365, priceChange: -0.5, stable: true });
    expect(s.withYield).toBeCloseTo(209.34, 2);
    expect(s.holdOnly).toBe(200);
  });

  it("computes impermanent loss for a full-range 50/50 pool", () => {
    expect(impermanentLoss(2)).toBeCloseTo(-0.0572, 4);
    expect(impermanentLoss(1)).toBe(0);
    const { lp, hold } = lpVsHold(1000, 0.5);
    expect(lp).toBeCloseTo(707.1, 1);
    expect(hold).toBe(750);
  });

  it("finds the days until yield pays back entry + exit costs", () => {
    expect(breakEvenDays(0.5, 200, 0.0467)).toBeCloseTo(19.54, 2);
    expect(breakEvenDays(0.5, 200, 0)).toBeNull();
    expect(breakEvenDays(0.5, 200, -0.01)).toBeNull();
    expect(breakEvenDays(0, 200, 0.05)).toBe(0);
  });

  it("prices the standard entry + exit gas", () => {
    expect(ENTRY_EXIT_GAS).toBe(446_000);
    expect(gasCostUsd(0.48, 2354)).toBeCloseTo(0.504, 3);
    expect(gasCostUsd(20, 2354)).toBeCloseTo(21.0, 1);
  });
});
