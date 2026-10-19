import { describe, it, expect } from "vitest";
import { deployerHoldingCheck, formatHoldingPct, holdingPct } from "./deployer-holdings";

describe("deployerHoldingCheck", () => {
  it("is unknown when the deployer or its balance can't be read", () => {
    expect(deployerHoldingCheck(3, false).status).toBe("unknown");
    expect(deployerHoldingCheck(null, true).status).toBe("unknown");
    expect(deployerHoldingCheck(Number.NaN, true).status).toBe("unknown");
  });

  it("flags a deployer that holds nothing (or dust) as exited", () => {
    const zero = deployerHoldingCheck(0, true);
    expect(zero.status).toBe("warn");
    expect(zero.value).toBe("0% · exited");
    expect(deployerHoldingCheck(0.004, true).value).toBe("<0.01% · exited");
  });

  it("passes a small stake, warns on a heavy one, fails on a dump-sized bag", () => {
    expect(deployerHoldingCheck(3.11, true)).toMatchObject({ status: "pass", value: "3.1%" });
    expect(deployerHoldingCheck(5, true).status).toBe("pass");
    expect(deployerHoldingCheck(9.4, true).status).toBe("warn");
    expect(deployerHoldingCheck(15, true).status).toBe("warn");
    expect(deployerHoldingCheck(22, true).status).toBe("fail");
  });

  it("puts the share in the explanation so the row stands on its own", () => {
    expect(deployerHoldingCheck(3.11, true).explain).toContain("3.1%");
  });
});

describe("holdingPct", () => {
  it("turns a balance into a share of supply", () => {
    expect(holdingPct(31_105_241.47, 1_000_000_000)).toBeCloseTo(3.11, 2);
    expect(holdingPct(0, 1_000_000_000)).toBe(0);
  });
  it("returns null when supply or balance is missing", () => {
    expect(holdingPct(null, 1_000)).toBeNull();
    expect(holdingPct(10, null)).toBeNull();
    expect(holdingPct(10, 0)).toBeNull();
  });
});

describe("formatHoldingPct", () => {
  it("keeps small shares readable", () => {
    expect(formatHoldingPct(0.5)).toBe("0.50%");
    expect(formatHoldingPct(12.345)).toBe("12.3%");
  });
});
