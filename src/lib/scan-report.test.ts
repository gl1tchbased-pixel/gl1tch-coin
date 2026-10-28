import { describe, it, expect } from "vitest";
import { X402_MIN_CONFIDENCE, paidScanOutcome } from "./scan-report";

describe("paidScanOutcome — a paid scan is only charged for a usable read", () => {
  it("passes a confident read through", () => {
    const r = { status: 200, body: { verdict: "CLEAN", confidence: 90 } };
    expect(paidScanOutcome(r)).toEqual(r);
  });

  it("turns a degraded read (confidence below the floor) into a 503, which is never settled", () => {
    const out = paidScanOutcome({ status: 200, body: { verdict: "UNKNOWN", confidence: X402_MIN_CONFIDENCE - 1 } });
    expect(out.status).toBe(503);
    expect(out.body).toEqual({ error: "sources degraded — retry; you were not charged", confidence: 59 });
  });

  it("keeps a read at exactly the floor", () => {
    expect(paidScanOutcome({ status: 200, body: { confidence: X402_MIN_CONFIDENCE } }).status).toBe(200);
  });

  it("passes a read without a confidence figure through", () => {
    expect(paidScanOutcome({ status: 200, body: { verdict: "CLEAN" } }).status).toBe(200);
  });

  it("leaves upstream failures as they are", () => {
    const r = { status: 422, body: { error: "scan failed", mint: "x" } };
    expect(paidScanOutcome(r)).toEqual(r);
  });
});
