import { describe, it, expect } from "vitest";
import { agentTrust, type AgentSignals } from "./trust.js";

const base = (over: Partial<AgentSignals> = {}): AgentSignals => ({
  verified: false, flaggedDeploys: 0, totalDeploys: 0, ageDays: null, attestations: 0, disputes: 0, ...over,
});

describe("agentTrust", () => {
  it("is 'unknown' when there is literally no signal", () => {
    const t = agentTrust(base());
    expect(t.level).toBe("unknown");
    expect(t.reasons[0]).toMatch(/no trust signal|never seen/i);
  });

  it("sinks a serial-rug deployer to caution", () => {
    const t = agentTrust(base({ flaggedDeploys: 3, totalDeploys: 4 }));
    expect(t.level).toBe("caution");
    expect(t.score).toBeLessThan(30);
    expect(t.reasons.join(" ")).toMatch(/serial-rug/i);
  });

  it("rewards a verified, established, clean agent", () => {
    const t = agentTrust(base({ verified: true, totalDeploys: 3, ageDays: 200, attestations: 2 }));
    expect(t.level).toBe("trusted");
    expect(t.score).toBeGreaterThanOrEqual(70);
  });

  it("does NOT trust a brand-new unverified wallet (absence of proof != proof)", () => {
    const t = agentTrust(base({ verified: false, ageDays: 1 }));
    expect(t.level).not.toBe("trusted");
    expect(t.score).toBeLessThan(50);
  });

  it("disputes bite harder than attestations help", () => {
    const withDisputes = agentTrust(base({ verified: true, ageDays: 100, disputes: 2 }));
    const withAttest = agentTrust(base({ verified: true, ageDays: 100, attestations: 2 }));
    expect(withDisputes.score).toBeLessThan(withAttest.score);
  });

  it("clamps score to 0-100", () => {
    const low = agentTrust(base({ flaggedDeploys: 9, disputes: 9 }));
    const high = agentTrust(base({ verified: true, totalDeploys: 5, ageDays: 999, attestations: 9 }));
    expect(low.score).toBeGreaterThanOrEqual(0);
    expect(high.score).toBeLessThanOrEqual(100);
  });
});
