import { describe, it, expect } from "vitest";
import { deriveResult, verifyRandomResult, requestIdOf, canonicalCommitment, listRoot, ALLOC_PREFIX, type Commitment, type FulfilledRecord } from "./random";

/**
 * Adversarial / invariant suite — codifies the security properties the audit-readiness
 * package (gl1tch-value-accrual-and-audit-readiness.md, §B.3) says must hold, so they are
 * test-enforced rather than merely claimed. Deterministic (fixed seeds/ids, no Math.random).
 */

const SEED = "3f".repeat(32); // stand-in drand randomness
const id64 = (i: number) => i.toString(16).padStart(64, "0");

// Helper: tally winners/values into buckets and assert roughly-flat distribution.
function assertFlat(counts: number[], n: number, samples: number, tolPct = 0.35) {
  const expected = samples / n;
  const lo = expected * (1 - tolPct);
  const hi = expected * (1 + tolPct);
  for (let b = 0; b < n; b++) {
    expect(counts[b], `bucket ${b}: ${counts[b]} not in [${lo.toFixed(0)}, ${hi.toFixed(0)}]`).toBeGreaterThan(lo);
    expect(counts[b]).toBeLessThan(hi);
  }
}

describe("I4 — unbiased fairness (no modulo or positional bias)", () => {
  it("random ints are ~uniform across the range", () => {
    const N = 10, SAMPLES = 8000;
    const counts = new Array(N).fill(0);
    for (let i = 0; i < SAMPLES; i++) {
      const v = deriveResult(SEED, id64(i), { kind: "ints", min: 0, max: N - 1, count: 1 }).values[0];
      counts[v]++;
    }
    assertFlat(counts, N, SAMPLES);
  });

  it("pick(1 of n) has no positional bias — every slot wins ~equally (Fisher-Yates soundness)", () => {
    const N = 10, SAMPLES = 8000;
    const counts = new Array(N).fill(0);
    for (let i = 0; i < SAMPLES; i++) {
      const idx = deriveResult(SEED, id64(i), { kind: "pick", n: N, k: 1 }).values[0];
      counts[idx]++;
    }
    assertFlat(counts, N, SAMPLES);
  });

  it("shuffle sends each element to each position ~equally (first slot is uniform)", () => {
    const N = 10, SAMPLES = 8000;
    const counts = new Array(N).fill(0);
    for (let i = 0; i < SAMPLES; i++) {
      const first = deriveResult(SEED, id64(i), { kind: "shuffle", n: N }).values[0];
      counts[first]++;
    }
    assertFlat(counts, N, SAMPLES);
  });

  it("a wide range near a power-of-two boundary stays in-range (rejection sampling holds)", () => {
    // range = 2^31 + 1 exercises the rejection path; must never throw or go out of range.
    const r = deriveResult(SEED, id64(7), { kind: "ints", min: 0, max: 2 ** 31, count: 200 });
    for (const v of r.values) expect(v >= 0 && v <= 2 ** 31).toBe(true);
  });
});

describe("I2/I4 — per-request binding (no cross-request replay of a seed)", () => {
  it("the same seed yields different results for different requestIds", () => {
    const spec = { kind: "ints", min: 0, max: 999999, count: 12 } as const;
    const a = deriveResult(SEED, id64(1), spec).values;
    const b = deriveResult(SEED, id64(2), spec).values;
    expect(a).not.toEqual(b);
  });
  it("the same requestId yields different results for different seeds", () => {
    const spec = { kind: "shuffle", n: 64 } as const;
    const a = deriveResult(SEED, id64(1), spec).values;
    const b = deriveResult("ab".repeat(32), id64(1), spec).values;
    expect(a).not.toEqual(b);
  });
  it("requestId binds salt + keyHash — two holders can't collide on the same draw", () => {
    const base: Commitment = {
      v: 1, keyHash: "aa".repeat(32), spec: { kind: "pick", n: 100, k: 3 }, salt: "",
      source: "drand-quicknet", chainHash: "dd".repeat(32), targetRound: 500, committedAt: 1_700_000_000_000,
    };
    const other: Commitment = { ...base, keyHash: "bb".repeat(32) };
    expect(requestIdOf(base)).not.toBe(requestIdOf(other));
    // Different ids → different derived winners from the same seed.
    const wa = deriveResult(SEED, requestIdOf(base), base.spec).values;
    const wb = deriveResult(SEED, requestIdOf(other), other.spec).values;
    expect(wa).not.toEqual(wb);
  });
});

describe("I5 — tamper-evidence in verifyRandomResult (re-derivation path)", () => {
  const entrants = Array.from({ length: 20 }, (_, i) => `w${i}`);
  const root = listRoot(entrants);
  const spec = { kind: "pick", n: entrants.length, k: 3 } as const;
  const salt = `${ALLOC_PREFIX}:${root}:x`;
  const c: Commitment = {
    v: 1, keyHash: "cc".repeat(32), spec, salt, source: "drand-quicknet",
    chainHash: "dd".repeat(32), targetRound: 900, committedAt: 1_700_000_000_000,
  };
  const id = requestIdOf(c);
  const result = deriveResult(SEED, id, spec);
  const good: FulfilledRecord = {
    id, status: "fulfilled", spec, salt, chainHash: "dd".repeat(32), targetRound: 900,
    committedAt: 1_700_000_000_000, commitmentString: canonicalCommitment(c),
    result, proof: { round: 900, randomness: SEED, signature: "00" },
    mode: "allocation", entrants, listRoot: root, winners: result.values.map((i) => entrants[i]),
  };

  it("altering the commitment string breaks the requestId check", () => {
    const rep = verifyRandomResult({ ...good, commitmentString: good.commitmentString.replace("targetRound=900", "targetRound=901") });
    expect(rep.checks.find((k) => k.label.startsWith("Commitment"))?.ok).toBe(false);
    expect(rep.ok).toBe(false);
  });
  it("swapping the seed makes the re-derived output diverge from the recorded result", () => {
    const rep = verifyRandomResult({ ...good, proof: { round: 900, randomness: "ff".repeat(32), signature: "00" } });
    expect(rep.checks.find((k) => k.label.startsWith("Re-derive"))?.ok).toBe(false);
  });
  it("inserting an extra entrant breaks the committed-root check", () => {
    const rep = verifyRandomResult({ ...good, entrants: [...entrants, "sneaky"] });
    expect(rep.checks.find((k) => k.label.startsWith("Entrant list"))?.ok).toBe(false);
  });
});
