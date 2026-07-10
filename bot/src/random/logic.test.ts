import { describe, it, expect } from "vitest";
import {
  validateSpec,
  canonicalCommitment,
  requestIdOf,
  deriveResult,
  type Commitment,
  type RandomSpec,
} from "./logic.js";

const SEED = "a".repeat(64); // stand-in for a drand randomness value (32 bytes hex)
const REQ = "b".repeat(64);

const commit = (spec: RandomSpec): Commitment => ({
  v: 1,
  keyHash: "c".repeat(64),
  spec,
  salt: "",
  source: "drand-quicknet",
  chainHash: "d".repeat(64),
  targetRound: 100,
  committedAt: 1_700_000_000_000,
});

describe("validateSpec", () => {
  it("accepts valid specs", () => {
    expect(validateSpec({ kind: "ints", min: 1, max: 6, count: 3 }).ok).toBe(true);
    expect(validateSpec({ kind: "shuffle", n: 10 }).ok).toBe(true);
    expect(validateSpec({ kind: "pick", n: 100, k: 5 }).ok).toBe(true);
  });
  it("rejects invalid specs", () => {
    expect(validateSpec({ kind: "ints", min: 6, max: 1, count: 1 }).ok).toBe(false);
    expect(validateSpec({ kind: "ints", min: 1, max: 6, count: 0 }).ok).toBe(false);
    expect(validateSpec({ kind: "ints", min: 1, max: 6, count: 99999 }).ok).toBe(false);
    expect(validateSpec({ kind: "shuffle", n: 0 }).ok).toBe(false);
    expect(validateSpec({ kind: "pick", n: 5, k: 6 }).ok).toBe(false);
    expect(validateSpec({ kind: "bogus" }).ok).toBe(false);
    expect(validateSpec({ kind: "ints", min: 1.5, max: 6, count: 1 }).ok).toBe(false);
  });
});

describe("commitment + requestId", () => {
  it("is deterministic and order-fixed", () => {
    const c = commit({ kind: "ints", min: 1, max: 6, count: 2 });
    expect(canonicalCommitment(c)).toBe(requestIdReadableCheck(c));
    expect(requestIdOf(c)).toBe(requestIdOf({ ...c }));
    expect(requestIdOf(c)).toMatch(/^[0-9a-f]{64}$/);
  });
  it("changes when any field changes", () => {
    const base = commit({ kind: "ints", min: 1, max: 6, count: 2 });
    expect(requestIdOf(base)).not.toBe(requestIdOf({ ...base, targetRound: 101 }));
    expect(requestIdOf(base)).not.toBe(requestIdOf({ ...base, salt: "x" }));
    expect(requestIdOf(base)).not.toBe(requestIdOf({ ...base, spec: { kind: "ints", min: 1, max: 6, count: 3 } }));
  });
});

// Helper just to make the canonical string assertion above explicit/readable.
function requestIdReadableCheck(c: Commitment): string {
  return [
    `v=1`,
    `keyHash=${c.keyHash}`,
    `spec=ints:1:6:2`,
    `salt=`,
    `source=drand-quicknet`,
    `chainHash=${c.chainHash}`,
    `targetRound=100`,
    `committedAt=1700000000000`,
  ].join("|");
}

describe("deriveResult — determinism + bounds", () => {
  it("is fully deterministic for the same seed+id+spec", () => {
    const spec: RandomSpec = { kind: "ints", min: 1, max: 6, count: 5 };
    const a = deriveResult(SEED, REQ, spec);
    const b = deriveResult(SEED, REQ, spec);
    expect(a).toEqual(b);
  });
  it("changes with a different seed", () => {
    const spec: RandomSpec = { kind: "ints", min: 0, max: 999999, count: 8 };
    expect(deriveResult(SEED, REQ, spec).values).not.toEqual(deriveResult("f".repeat(64), REQ, spec).values);
  });
  it("ints stay within [min,max]", () => {
    const r = deriveResult(SEED, REQ, { kind: "ints", min: 10, max: 20, count: 500 });
    expect(r.values).toHaveLength(500);
    for (const v of r.values) expect(v >= 10 && v <= 20).toBe(true);
  });
  it("shuffle is a valid permutation of [0,n)", () => {
    const n = 200;
    const r = deriveResult(SEED, REQ, { kind: "shuffle", n });
    expect(r.values).toHaveLength(n);
    expect(new Set(r.values).size).toBe(n);
    expect(Math.min(...r.values)).toBe(0);
    expect(Math.max(...r.values)).toBe(n - 1);
  });
  it("pick yields k distinct indices in [0,n)", () => {
    const r = deriveResult(SEED, REQ, { kind: "pick", n: 1000, k: 7 });
    expect(r.values).toHaveLength(7);
    expect(new Set(r.values).size).toBe(7);
    for (const v of r.values) expect(v >= 0 && v < 1000).toBe(true);
  });
});

describe("deriveResult — distribution sanity (unbiased)", () => {
  it("a coin flip over many draws is roughly balanced", () => {
    // Different requestIds simulate many independent draws with a fixed seed.
    let heads = 0;
    const N = 4000;
    for (let i = 0; i < N; i++) {
      const r = deriveResult(SEED, `req-${i}`.padEnd(64, "0"), { kind: "ints", min: 0, max: 1, count: 1 });
      heads += r.values[0];
    }
    const ratio = heads / N;
    expect(ratio).toBeGreaterThan(0.45);
    expect(ratio).toBeLessThan(0.55);
  });
});

// A frozen parity vector — the site's mirror derivation MUST reproduce these exact outputs.
// (Cross-checked against src/lib/quantum/random.test.ts — byte-identical bot ⇄ site.)
const PARITY_SEED = "1234abcd".repeat(8);
const PARITY_ID = "00ff".repeat(16);
describe("parity vector", () => {
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
    const c: Commitment = commit({ kind: "ints", min: 1, max: 100, count: 5 });
    expect(requestIdOf(c)).toBe("8ceace15e5909094290f93d1e3b3aa28ccf0cd1bdfa4dfc0224895f7a1209367");
  });
});
