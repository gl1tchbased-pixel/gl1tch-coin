import { describe, it, expect } from "vitest";
import { verifyDrandRound } from "./drand";

// Fixed real drand vector (League of Entropy quicknet, round 30,000,000).
const ROUND = 30000000;
const SIG = "81d2fc112b91932d9e4074a46b88c4dc78149b859660e0673c0bb9bd0caefdc9cc194e83de980441355b8ef44cc7a355";
const RANDOMNESS = "24fdbb00b10a967c392b5b708967011e996689994a2bf1c5573c3e372c2e844d";

describe("drand — BLS verification", () => {
  it("verifies a genuine drand round (real BLS12-381 check)", () => {
    expect(verifyDrandRound(ROUND, SIG, RANDOMNESS)).toBe(true);
  });

  it("rejects a wrong round number for the same signature", () => {
    expect(verifyDrandRound(ROUND + 1, SIG, RANDOMNESS)).toBe(false);
  });

  it("rejects a tampered signature", () => {
    const bad = SIG.slice(0, -2) + (SIG.endsWith("00") ? "11" : "00");
    expect(verifyDrandRound(ROUND, bad, RANDOMNESS)).toBe(false);
  });

  it("rejects randomness that isn't sha256(signature)", () => {
    expect(verifyDrandRound(ROUND, SIG, "0".repeat(64))).toBe(false);
  });

  it("rejects malformed hex without throwing", () => {
    expect(verifyDrandRound(ROUND, "zzz", RANDOMNESS)).toBe(false);
  });
});
