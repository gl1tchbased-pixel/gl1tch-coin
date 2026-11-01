import { describe, expect, it } from "vitest";
import { appliedFeeBps, checkSwapGate, feeLabel, parseSwapLamports, safeSymbol, swapFee, swapFeeFor } from "./safe-swap-gate";
import { CONTRACT_ADDRESS } from "@/lib/official";
import { REFERRAL_ACCOUNT } from "@/lib/official";

const ADDRESS = "So11111111111111111111111111111111111111112";

describe("checkSwapGate", () => {
  it("passes a confident clean scan", () => {
    expect(checkSwapGate(200, { verdict: "CLEAN", score: 90, confidence: 90 })).toEqual({ ok: true });
  });

  it("does not let a source outage block a verified blue-chip", () => {
    expect(checkSwapGate(200, { verdict: "CLEAN", score: 90, confidence: 50, verified: true })).toEqual({ ok: true });
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
  it("always pays the pinned account at 50 bps: no setting can redirect or raise it", () => {
    const pinned = { account: REFERRAL_ACCOUNT, bps: 50 };
    expect(swapFee({})).toEqual(pinned);
    expect(swapFee({ JUP_REFERRAL_ACCOUNT: ADDRESS })).toEqual(pinned);
    expect(swapFee({ JUP_REFERRAL_ACCOUNT: ADDRESS, JUP_REFERRAL_FEE_BPS: "255" })).toEqual(pinned);
    expect(feeLabel(50)).toBe("0.5% GL1TCH fee");
  });

  it("turns off with the kill switch", () => {
    expect(swapFee({ JUP_REFERRAL_ACCOUNT: "off" })).toBeNull();
    expect(feeLabel(undefined)).toBe("No GL1TCH fee");
  });
});

describe("appliedFeeBps", () => {
  it("claims the fee only when Jupiter reports it, not when it fell back to its own default", () => {
    expect(appliedFeeBps(50, { feeBps: 50 })).toBe(50);
    expect(appliedFeeBps(50, { feeBps: 62 })).toBe(50);
    expect(appliedFeeBps(50, { feeBps: 10 })).toBeUndefined();
    expect(appliedFeeBps(50, {})).toBeUndefined();
  });
});

describe("safeSymbol", () => {
  it("keeps plain tickers and drops text a launcher could use to fool a signer", () => {
    expect(safeSymbol("BONK")).toBe("BONK");
    expect(safeSymbol("VERIFIED SAFE, GL1TCH APPROVED")).toBe("this token");
    expect(safeSymbol(undefined)).toBe("this token");
  });
});

describe("swapFeeFor", () => {
  it("charges no fee on our own token", () => {
    expect(swapFeeFor(CONTRACT_ADDRESS, {})).toBeNull();
    expect(swapFeeFor("JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN", {})?.bps).toBe(50);
  });

  it("obeys the kill switch", () => {
    expect(swapFeeFor("JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN", { JUP_REFERRAL_ACCOUNT: "off" })).toBeNull();
  });
});
