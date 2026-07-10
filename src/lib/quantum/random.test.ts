import { describe, it, expect } from "vitest";
import { deriveResult, requestIdOf, canonicalCommitment, type Commitment } from "./random";

/**
 * Byte-identity with the bot. These exact vectors are also asserted in
 * bot/src/random/logic.test.ts — if the two derivations ever diverge, a result the
 * bot returns could not be recomputed here, breaking the "verify, don't trust" promise.
 */
const PARITY_SEED = "1234abcd".repeat(8);
const PARITY_ID = "00ff".repeat(16);

describe("site ⇄ bot derivation parity", () => {
  it("ints reference output", () => {
    expect(deriveResult(PARITY_SEED, PARITY_ID, { kind: "ints", min: 1, max: 100, count: 5 }).values).toEqual([36, 60, 67, 69, 76]);
  });
  it("shuffle reference output", () => {
    expect(deriveResult(PARITY_SEED, PARITY_ID, { kind: "shuffle", n: 8 }).values).toEqual([2, 6, 0, 5, 7, 4, 1, 3]);
  });
  it("pick reference output", () => {
    expect(deriveResult(PARITY_SEED, PARITY_ID, { kind: "pick", n: 50, k: 5 }).values).toEqual([35, 9, 12, 15, 43]);
  });
  it("requestId reference", () => {
    const c: Commitment = {
      v: 1,
      keyHash: "c".repeat(64),
      spec: { kind: "ints", min: 1, max: 100, count: 5 },
      salt: "",
      source: "drand-quicknet",
      chainHash: "d".repeat(64),
      targetRound: 100,
      committedAt: 1_700_000_000_000,
    };
    expect(canonicalCommitment(c)).toContain("spec=ints:1:100:5");
    expect(requestIdOf(c)).toBe("8ceace15e5909094290f93d1e3b3aa28ccf0cd1bdfa4dfc0224895f7a1209367");
  });
});

describe("derivation invariants", () => {
  it("ints stay in range and are deterministic", () => {
    const r1 = deriveResult(PARITY_SEED, "abc".padEnd(64, "0"), { kind: "ints", min: -5, max: 5, count: 300 });
    const r2 = deriveResult(PARITY_SEED, "abc".padEnd(64, "0"), { kind: "ints", min: -5, max: 5, count: 300 });
    expect(r1.values).toEqual(r2.values);
    for (const v of r1.values) expect(v >= -5 && v <= 5).toBe(true);
  });
  it("shuffle is a permutation", () => {
    const r = deriveResult(PARITY_SEED, "xyz".padEnd(64, "0"), { kind: "shuffle", n: 500 });
    expect(new Set(r.values).size).toBe(500);
  });
});
