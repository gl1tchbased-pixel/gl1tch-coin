import { describe, it, expect } from "vitest";
import { rayAprToApy, growthApy, epochApy, epochsPerYear, feeApr, YEAR_MS } from "./math.js";

describe("yield math", () => {
  it("compounds an Aave ray APR per second (USDC Ethereum, 29 Oct 2026)", () => {
    expect(rayAprToApy(44_670_000_000_000_000_000_000_000n)).toBeCloseTo(0.04568, 4);
  });

  it("annualizes exchange-rate growth and keeps losses negative", () => {
    expect(growthApy(1.0, 0, 1.01, YEAR_MS / 2)).toBeCloseTo(0.0201, 4);
    expect(growthApy(1.0, 0, 0.99, YEAR_MS)).toBeCloseTo(-0.01, 10);
  });

  it("refuses a zero/negative span or a non-positive start rate", () => {
    expect(growthApy(1.0, 5, 1.01, 5)).toBeNull();
    expect(growthApy(1.0, 10, 1.01, 5)).toBeNull();
    expect(growthApy(0, 0, 1.01, YEAR_MS)).toBeNull();
  });

  it("annualizes one epoch of stake-pool growth (JitoSOL, 29 Oct 2026)", () => {
    expect(epochApy(1.30876307, 1.30857957, 341)).toBeCloseTo(0.049, 3);
    expect(epochApy(1.3, 0, 341)).toBeNull();
  });

  it("derives epochs per year from slot speed", () => {
    expect(epochsPerYear(432000, 4.669)).toBeGreaterThan(340);
    expect(epochsPerYear(432000, 4.669)).toBeLessThan(342);
    expect(epochsPerYear(0, 4.669)).toBeNull();
    expect(epochsPerYear(432000, 0)).toBeNull();
  });
});

describe("feeApr (full-range LP fees from cumulative fee counters)", () => {
  const Q64 = 1n << 64n;
  const DAY = 86_400_000;

  it("turns one day of fee growth into an annual rate", () => {
    const fee = (Q64 * 1n) / 1000n; // 0.001 per unit of liquidity, both tokens
    const apr = feeApr({ t: 0, fee0: 0n, fee1: 0n }, { t: DAY, fee0: fee, fee1: fee, sqrtPrice: Q64 }, { fee: 64, sqrt: 64 });
    expect(apr).toBeCloseTo(0.365, 4);
  });

  it("handles counters that wrapped around", () => {
    const max = 1n << 128n;
    const a = feeApr({ t: 0, fee0: max - 10n, fee1: 0n }, { t: DAY, fee0: 5n, fee1: 0n, sqrtPrice: Q64 }, { fee: 64, sqrt: 64 });
    const b = feeApr({ t: 0, fee0: 0n, fee1: 0n }, { t: DAY, fee0: 15n, fee1: 0n, sqrtPrice: Q64 }, { fee: 64, sqrt: 64 });
    expect(a).toBeCloseTo(b!, 12);
    expect(a).toBeGreaterThan(0);
  });

  it("refuses a zero span or a zero price", () => {
    expect(feeApr({ t: 5, fee0: 0n, fee1: 0n }, { t: 5, fee0: 1n, fee1: 1n, sqrtPrice: Q64 }, { fee: 64, sqrt: 64 })).toBeNull();
    expect(feeApr({ t: 0, fee0: 0n, fee1: 0n }, { t: DAY, fee0: 1n, fee1: 1n, sqrtPrice: 0n }, { fee: 64, sqrt: 64 })).toBeNull();
  });

  it("supports Uniswap's Q128 fee counters and Q96 prices", () => {
    const Q128 = 1n << 128n, Q96 = 1n << 96n;
    const fee = Q128 / 1000n;
    const apr = feeApr({ t: 0, fee0: 0n, fee1: 0n }, { t: DAY, fee0: fee, fee1: fee, sqrtPrice: Q96 }, { fee: 128, sqrt: 96 });
    expect(apr).toBeCloseTo(0.365, 4);
  });
});
