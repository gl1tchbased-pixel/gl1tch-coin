import { describe, it, expect } from "vitest";
import {
  validateLabels,
  listRoot,
  allocationSalt,
  parseAllocationSalt,
  requestIdOf,
  deriveResult,
  type Commitment,
} from "./logic.js";

describe("validateLabels", () => {
  it("accepts a clean list (trimmed)", () => {
    const v = validateLabels([" alice ", "bob", "carol"]);
    expect(v.ok).toBe(true);
    if (v.ok) expect(v.labels).toEqual(["alice", "bob", "carol"]);
  });
  it("rejects too-few / too-many / non-string / dupes / oversize", () => {
    expect(validateLabels(["only-one"]).ok).toBe(false);
    expect(validateLabels(["a", "a"]).ok).toBe(false);
    expect(validateLabels(["a", 5 as unknown as string]).ok).toBe(false);
    expect(validateLabels(["a", "  "]).ok).toBe(false);
    expect(validateLabels(["a", "x".repeat(121)]).ok).toBe(false);
    expect(validateLabels("nope" as unknown).ok).toBe(false);
  });
});

describe("salt binding", () => {
  it("round-trips root + user salt", () => {
    const root = listRoot(["a", "b", "c"]);
    const salt = allocationSalt(root, "giveaway-3");
    const parsed = parseAllocationSalt(salt);
    expect(parsed).toEqual({ root, userSalt: "giveaway-3" });
  });
  it("handles a user salt containing colons", () => {
    const root = listRoot(["a", "b"]);
    const parsed = parseAllocationSalt(allocationSalt(root, "a:b:c"));
    expect(parsed).toEqual({ root, userSalt: "a:b:c" });
  });
  it("returns null for a non-allocation salt", () => {
    expect(parseAllocationSalt("just-a-salt")).toBeNull();
  });
  it("a different list yields a different root (tamper-evident)", () => {
    expect(listRoot(["a", "b", "c"])).not.toBe(listRoot(["a", "b", "d"]));
    expect(listRoot(["a", "b", "c"])).not.toBe(listRoot(["a", "c", "b"])); // order matters
  });
});

describe("winner selection is deterministic + distinct + in-range", () => {
  const labels = Array.from({ length: 200 }, (_, i) => `wallet-${i}`);
  const root = listRoot(labels);
  const commit = (): Commitment => ({
    v: 1,
    keyHash: "c".repeat(64),
    spec: { kind: "pick", n: labels.length, k: 10 },
    salt: allocationSalt(root, "drop"),
    source: "drand-quicknet",
    chainHash: "d".repeat(64),
    targetRound: 500,
    committedAt: 1_700_000_000_000,
  });

  it("maps k distinct indices to k distinct entrants", () => {
    const c = commit();
    const id = requestIdOf(c);
    const seed = "9".repeat(64);
    const idx = deriveResult(seed, id, c.spec).values;
    expect(idx).toHaveLength(10);
    expect(new Set(idx).size).toBe(10);
    const winners = idx.map((i) => labels[i]);
    expect(new Set(winners).size).toBe(10);
    for (const w of winners) expect(labels.includes(w)).toBe(true);
    // Re-derivation is stable.
    expect(deriveResult(seed, id, c.spec).values).toEqual(idx);
  });
});
