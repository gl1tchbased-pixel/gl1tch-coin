import { describe, it, expect } from "vitest";
import { deployerCopy } from "./deployer-status";

describe("deployerCopy", () => {
  it("states the live share when the chain was readable", () => {
    const c = deployerCopy({ tokens: 31_105_241.47, pct: 3.11, at: 0 });
    expect(c.short).toBe("Holds 3.1% of supply right now (live)");
    expect(c.now).toContain("31.1M GL1TCH (3.1% of supply)");
  });
  it("says so plainly when the wallet holds nothing", () => {
    expect(deployerCopy({ tokens: 0, pct: 0, at: 0 }).now).toBe("holds none right now");
  });
  it("points to Solscan instead of guessing when the chain wasn't readable", () => {
    expect(deployerCopy(null).now).toMatch(/Solscan/);
  });
});
