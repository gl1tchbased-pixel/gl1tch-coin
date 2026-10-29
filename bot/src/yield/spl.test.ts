import { describe, it, expect } from "vitest";
import fs from "node:fs";
import { parseStakePool } from "./spl.js";

// Real account data of the JitoSOL stake pool (Jito4APyf642JPZPx3hGc6WWJ8zPKtRbRs4P815Awbb), slot 462935762.
const fixture = Buffer.from(fs.readFileSync(new URL("./fixtures/jitosol-pool.b64", import.meta.url), "utf8").trim(), "base64");

describe("parseStakePool", () => {
  it("reads the JitoSOL pool", () => {
    const s = parseStakePool(fixture);
    expect(s).not.toBeNull();
    expect(s!.poolMint).toBe("J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn");
    const rate = Number(s!.totalLamports) / Number(s!.poolTokenSupply);
    expect(rate).toBeGreaterThan(1.2);
    expect(rate).toBeLessThan(1.5);
    expect(s!.lastEpochTotalLamports > 0n).toBe(true);
    expect(s!.lastEpochPoolTokenSupply > 0n).toBe(true);
    expect(s!.epochFee.denominator > 0n).toBe(true);
    // the previous epoch's rate is a hair below the current one
    const prev = Number(s!.lastEpochTotalLamports) / Number(s!.lastEpochPoolTokenSupply);
    expect(prev).toBeLessThanOrEqual(rate);
    expect(rate / prev - 1).toBeLessThan(0.001);
  });

  it("rejects a truncated buffer", () => {
    expect(parseStakePool(fixture.subarray(0, 100))).toBeNull();
    expect(parseStakePool(fixture.subarray(0, 300))).toBeNull();
  });

  it("rejects an account that is not a stake pool", () => {
    const other = Buffer.from(fixture);
    other[0] = 2;
    expect(parseStakePool(other)).toBeNull();
  });
});
