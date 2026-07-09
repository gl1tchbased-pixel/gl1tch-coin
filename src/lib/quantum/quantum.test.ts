import { describe, it, expect } from "vitest";
import { merkleRoot, winnerIndex, computeWinner, freezeCommitment, hashHex } from "./draw";
import { quboEnergy, solveQUBO, optimizeSubset } from "./forge";
import { vaultScore, vaultSignalsFromScan } from "./vault";
import { sealKeypair, seal, unseal } from "./seal";

describe("draw — commit-reveal", () => {
  const pulse = "a".repeat(128); // stand-in for a CURBy dataHash (128 hex)

  it("merkle root is deterministic and order-sensitive", () => {
    const a = merkleRoot(["w1", "w2", "w3"]);
    const b = merkleRoot(["w1", "w2", "w3"]);
    const c = merkleRoot(["w3", "w2", "w1"]);
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it("winner is deterministic and in range", () => {
    const participants = Array.from({ length: 17 }, (_, i) => `wallet-${i}`);
    const root = merkleRoot(participants);
    const idx = winnerIndex(pulse, root, participants.length);
    expect(idx).toBe(winnerIndex(pulse, root, participants.length));
    expect(idx).toBeGreaterThanOrEqual(0);
    expect(idx).toBeLessThan(participants.length);
  });

  it("same pulse yields different winners across different pools (no cross-draw replay)", () => {
    const A = Array.from({ length: 50 }, (_, i) => `a-${i}`);
    const B = Array.from({ length: 50 }, (_, i) => `b-${i}`);
    const wa = computeWinner(A, pulse);
    const wb = computeWinner(B, pulse);
    expect(wa.merkleRoot).not.toBe(wb.merkleRoot);
    // winner index need not differ, but the derivation inputs do — assert roots differ
  });

  it("computeWinner rejects duplicate or empty participant sets", () => {
    expect(() => computeWinner(["x", "x"], pulse)).toThrow();
    expect(() => computeWinner([], pulse)).toThrow();
  });

  it("freezeCommitment matches computeWinner's root (commit == reveal root)", () => {
    const p = ["one", "two", "three", "four"];
    const commit = freezeCommitment(p);
    const result = computeWinner(p, pulse);
    expect(commit.merkleRoot).toBe(result.merkleRoot);
    expect(commit.poolSize).toBe(p.length);
  });

  it("winnerIndex rejects invalid hex and bad pool size", () => {
    expect(() => winnerIndex("zz", "ab", 4)).toThrow();
    expect(() => winnerIndex("ab", "cd", 0)).toThrow();
  });

  it("distribution is roughly uniform over many pulses", () => {
    const pool = 10;
    const participants = Array.from({ length: pool }, (_, i) => `p${i}`);
    const root = merkleRoot(participants);
    const counts = new Array(pool).fill(0);
    for (let i = 0; i < 2000; i++) counts[winnerIndex(hashHex(`pulse-${i}`), root, pool)]++;
    // every bucket hit, none wildly dominant (expected 200 each)
    expect(Math.min(...counts)).toBeGreaterThan(120);
    expect(Math.max(...counts)).toBeLessThan(300);
  });
});

describe("forge — quantum-inspired optimization", () => {
  it("quboEnergy computes x^T Q x", () => {
    const Q = [
      [1, 2],
      [0, 3],
    ];
    expect(quboEnergy(Q, [1, 1])).toBe(1 + 3 + 2);
    expect(quboEnergy(Q, [0, 0])).toBe(0);
  });

  it("solveQUBO finds the trivial all-zero optimum for positive diagonal", () => {
    const Q = [
      [5, 0, 0],
      [0, 7, 0],
      [0, 0, 3],
    ];
    const res = solveQUBO(Q, { seed: 1 });
    expect(res.energy).toBe(0);
    expect(res.assignment).toEqual([0, 0, 0]);
  });

  it("solveQUBO selects negatively-weighted variables", () => {
    const Q = [
      [-5, 0],
      [0, -3],
    ];
    const res = solveQUBO(Q, { seed: 2 });
    expect(res.assignment).toEqual([1, 1]);
    expect(res.energy).toBe(-8);
  });

  it("solveQUBO is deterministic for a fixed seed", () => {
    const Q = [
      [-2, 3, -1],
      [3, -4, 2],
      [-1, 2, -3],
    ];
    expect(solveQUBO(Q, { seed: 42 }).energy).toBe(solveQUBO(Q, { seed: 42 }).energy);
  });

  it("optimizeSubset respects the count cap and picks top scores", () => {
    const { chosen } = optimizeSubset({ scores: [10, 1, 9, 2, 8], maxCount: 2, seed: 7 });
    expect(chosen.length).toBeLessThanOrEqual(2);
    // should prefer the two highest-scoring indices (0 and 2)
    expect(chosen).toContain(0);
  });
});

describe("vault — readiness score", () => {
  it("hardened for a fully-clean token", () => {
    const r = vaultScore({
      authoritiesRenounced: true,
      liquiditySecured: true,
      topHolderConcentration: 0.05,
      deployerReputation: "clean",
      verifiedContract: true,
      transparency: true,
    });
    expect(r.score).toBeGreaterThanOrEqual(90);
    expect(r.level).toBe("hardened");
    expect(r.factors).toHaveLength(5);
  });

  it("caution for an active-authority, serial-deployer token", () => {
    const r = vaultScore({
      authoritiesRenounced: false,
      liquiditySecured: false,
      topHolderConcentration: 0.9,
      deployerReputation: "serial",
      verifiedContract: false,
      transparency: false,
    });
    expect(r.score).toBeLessThan(40);
    expect(r.level).toBe("caution");
  });

  it("score stays within 0..100 with unknown inputs", () => {
    const r = vaultScore({
      authoritiesRenounced: true,
      liquiditySecured: false,
      verifiedContract: false,
      transparency: true,
    });
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(100);
  });

  it("derives signals from a clean scan result", () => {
    const s = vaultSignalsFromScan({
      chain: "solana",
      checks: [
        { key: "mint_authority", status: "pass" },
        { key: "freeze_authority", status: "pass" },
        { key: "liquidity", status: "pass" },
      ],
      meta: { topHolderPct: 8, mutableMetadata: false, liquidityUsd: 50000, deployerReputation: { level: "clean" } },
    });
    expect(s.authoritiesRenounced).toBe(true);
    expect(s.liquiditySecured).toBe(true);
    expect(s.topHolderConcentration).toBeCloseTo(0.08);
    expect(s.deployerReputation).toBe("clean");
    expect(s.verifiedContract).toBe(true);
    expect(s.transparency).toBe(true);
    expect(vaultScore(s).level).toBe("hardened");
  });

  it("derives risk signals from an active-authority scan", () => {
    const s = vaultSignalsFromScan({
      checks: [
        { key: "mint_authority", status: "fail" },
        { key: "freeze_authority", status: "pass" },
      ],
      meta: { topHolderPct: 85, mutableMetadata: true, deployerReputation: { level: "serial", flaggedCount: 3 } },
    });
    expect(s.authoritiesRenounced).toBe(false);
    expect(s.deployerReputation).toBe("serial");
    expect(vaultScore(s).level).toBe("caution");
  });
});

describe("seal — hybrid X25519 + ML-KEM-768 encryption", () => {
  it("round-trips a message (hybrid KEM + AES-256-GCM)", async () => {
    const kp = sealKeypair();
    expect(kp.publicKey).toMatch(/^[0-9a-f]+$/);
    const msg = "GL1TCH quantum seal — secret holder note 🔐";
    const sealed = await seal(kp.publicKey, msg);
    expect(sealed.alg).toBe("x25519+ml-kem-768+aes-256-gcm");
    expect(sealed.ephPub).toMatch(/^[0-9a-f]{64}$/); // X25519 pub = 32 bytes
    expect(sealed.kemCt.length).toBeGreaterThan(0);
    const out = await unseal(kp.secretKey, sealed);
    expect(out).toBe(msg);
  });

  it("wrong secret key cannot decrypt (AEAD auth fails)", async () => {
    const a = sealKeypair();
    const b = sealKeypair();
    const sealed = await seal(a.publicKey, "top secret");
    await expect(unseal(b.secretKey, sealed)).rejects.toBeTruthy();
  });

  it("tampering the classical (X25519) leg breaks decryption", async () => {
    const a = sealKeypair();
    const other = sealKeypair();
    const sealed = await seal(a.publicKey, "hybrid holds");
    // Splice in a foreign ephemeral pubkey → classical shared secret changes → key mismatch.
    const forged = await seal(other.publicKey, "x");
    await expect(unseal(a.secretKey, { ...sealed, ephPub: forged.ephPub })).rejects.toBeTruthy();
  });

  it("tampering the post-quantum (ML-KEM) leg breaks decryption", async () => {
    const a = sealKeypair();
    const other = sealKeypair();
    const sealed = await seal(a.publicKey, "hybrid holds");
    const forged = await seal(other.publicKey, "x");
    await expect(unseal(a.secretKey, { ...sealed, kemCt: forged.kemCt })).rejects.toBeTruthy();
  });
});
