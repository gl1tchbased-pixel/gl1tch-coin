import { describe, it, expect } from "vitest";
import { rayAprToApy, growthApy, epochApy, epochsPerYear, YEAR_MS } from "./math.js";

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
