import { describe, expect, it } from "vitest";
import { MAX_RECORDS, validateBatch } from "./records.js";

const now = 1792540800000;
const sol = (mint: string, extra: Record<string, unknown> = {}) => ({
  chain: "solana",
  mint,
  verdict: "HIGH RISK",
  score: 41.6,
  scannedAt: now + 2000,
  ...extra,
});
const MINT_A = "3HQJwwHvzy8pGkPqGQcb4thZCH88MUCHVVSNtHn6pump";
const MINT_B = "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263";
const check = (body: unknown) => validateBatch(body, { now, maxAgeMs: 6 * 3_600_000 });

describe("validateBatch", () => {
  it("accepts a clean sweep and keeps only the known fields", () => {
    const out = check({ sweepMs: now, records: [sol(MINT_A, { name: "<script>", reason: "x" }), sol(MINT_B)] });
    expect("error" in out).toBe(false);
    if ("error" in out) return;
    expect(out.records[0]).toEqual({ chain: "solana", mint: MINT_A, verdict: "HIGH RISK", score: 42, scannedAt: now + 2000 });
  });
  it("accepts EVM addresses on known chains only", () => {
    const evm = { chain: "base", mint: "0x6982508145454ce325ddbe47a25d4ec3d2311933", verdict: "CAUTION", score: 60, scannedAt: now };
    expect("error" in check({ sweepMs: now, records: [evm] })).toBe(false);
    expect("error" in check({ sweepMs: now, records: [{ ...evm, chain: "evil" }] })).toBe(true);
  });
  it.each([
    ["bad mint", sol("not-a-mint!")],
    ["unknown verdict", sol(MINT_A, { verdict: "SAFU" })],
    ["score out of range", sol(MINT_A, { score: 101 })],
    ["NaN score", sol(MINT_A, { score: Number.NaN })],
    ["scan long after the sweep", sol(MINT_A, { scannedAt: now + 60 * 60_000 })],
    ["fractional time", sol(MINT_A, { scannedAt: now + 0.5 })],
  ])("rejects a record with %s", (_label, rec) => {
    expect("error" in check({ sweepMs: now, records: [rec] })).toBe(true);
  });
  it("rejects repeated tokens, empty and oversized sweeps", () => {
    expect("error" in check({ sweepMs: now, records: [sol(MINT_A), sol(MINT_A)] })).toBe(true);
    expect("error" in check({ sweepMs: now, records: [] })).toBe(true);
    const many = Array.from({ length: MAX_RECORDS + 1 }, () => sol(MINT_A));
    expect(check({ sweepMs: now, records: many })).toEqual({ error: `at most ${MAX_RECORDS} records` });
  });
  it("rejects stale or future sweeps", () => {
    expect("error" in check({ sweepMs: now - 7 * 3_600_000, records: [sol(MINT_A, { scannedAt: now - 7 * 3_600_000 })] })).toBe(true);
    expect("error" in check({ sweepMs: now + 3_600_000, records: [sol(MINT_A, { scannedAt: now + 3_600_000 })] })).toBe(true);
    expect("error" in check(null)).toBe(true);
  });
});
