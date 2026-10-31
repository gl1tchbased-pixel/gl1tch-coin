import { describe, expect, it } from "vitest";
import { checkSwapGate, feeLabel, parseSwapLamports, swapFee } from "./safe-swap-gate";

const ADDRESS = "So11111111111111111111111111111111111111112";

describe("checkSwapGate", () => {
  it("passes a confident clean scan", () => {
    expect(checkSwapGate(200, { verdict: "CLEAN", score: 90, confidence: 90 })).toEqual({ ok: true });
  });

  it.each([
    ["failed scan", 503, { verdict: "CLEAN", score: 90 }],
    ["missing body", 200, null],
    ["caution", 200, { verdict: "CAUTION", score: 90 }],
    ["high risk", 200, { verdict: "HIGH RISK", score: 90 }],
    ["rug-shaped", 200, { verdict: "RUG-SHAPED", score: 90 }],
    ["unknown", 200, { verdict: "UNKNOWN", score: 90 }],
    ["no verdict", 200, { score: 90 }],
    ["low score", 200, { verdict: "CLEAN", score: 59 }],
    ["no score", 200, { verdict: "CLEAN" }],
    ["degraded sources", 200, { verdict: "CLEAN", score: 90, confidence: 59 }],
  ])("refuses %s", (_name, status, body) => {
    expect(checkSwapGate(status, body).ok).toBe(false);
  });
});

describe("parseSwapLamports", () => {
  it("converts valid amounts", () => {
    expect(parseSwapLamports("0.25")).toBe(250_000_000);
  });

  it.each([null, "", "abc", "0.001", "101", "Infinity", "-1"])("rejects %s", (raw) => {
    expect(parseSwapLamports(raw)).toBeNull();
  });
});

describe("swapFee", () => {
  it("charges nothing without a valid referral account", () => {
    expect(swapFee({})).toBeNull();
    expect(swapFee({ JUP_REFERRAL_ACCOUNT: "nope" })).toBeNull();
    expect(feeLabel(undefined)).toBe("No GL1TCH fee");
  });

  it("defaults to 50 bps and rejects out-of-range values", () => {
    expect(swapFee({ JUP_REFERRAL_ACCOUNT: ADDRESS })).toEqual({ account: ADDRESS, bps: 50 });
    expect(swapFee({ JUP_REFERRAL_ACCOUNT: ADDRESS, JUP_REFERRAL_FEE_BPS: "999" })?.bps).toBe(50);
    expect(feeLabel(50)).toBe("0.5% GL1TCH fee");
  });
});
