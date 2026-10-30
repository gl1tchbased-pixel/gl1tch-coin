import { describe, it, expect } from "vitest";
import {
  ZKAP_MIN_HOLDING,
  generateZKHolderProof,
  verifyZKHolderProof,
} from "./zkap";

describe("ZKAP — Zero-Knowledge Holder Verification", () => {
  const TEST_WALLET = "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU";
  const NOW = 1_730_000_000_000;

  it("generates and verifies a valid proof for a holder with >= 100,000 $GL1TCH", async () => {
    const proof = await generateZKHolderProof({
      wallet: TEST_WALLET,
      balance: 250_000,
      timestamp: NOW,
    });

    const res = await verifyZKHolderProof(proof, { now: NOW + 5_000 });
    expect(res.valid).toBe(true);
    expect(res.threshold).toBe(ZKAP_MIN_HOLDING);
    expect(res.nullifier).toHaveLength(64);

    // Zero-knowledge privacy check: neither wallet nor exact balance is leaked in the serialized proof.
    const serialized = JSON.stringify(proof);
    expect(serialized).not.toContain(TEST_WALLET);
    expect(serialized).not.toContain("250000");
  });

  it("refuses to generate a proof when balance is below 100,000 $GL1TCH", async () => {
    await expect(
      generateZKHolderProof({
        wallet: TEST_WALLET,
        balance: 99_999,
        timestamp: NOW,
      }),
    ).rejects.toThrow(/Insufficient \$GL1TCH balance/);
  });

  it("rejects tampered bit commitments or challenge digests", async () => {
    const proof = await generateZKHolderProof({
      wallet: TEST_WALLET,
      balance: 100_000,
      timestamp: NOW,
    });

    const tampered = {
      ...proof,
      bitCommitments: ["0".repeat(64), ...proof.bitCommitments.slice(1)],
    };
    const res = await verifyZKHolderProof(tampered, { now: NOW });
    expect(res.valid).toBe(false);
    expect(res.reason).toBe("challenge_mismatch");
  });

  it("rejects expired proofs outside the freshness window", async () => {
    const proof = await generateZKHolderProof({
      wallet: TEST_WALLET,
      balance: 150_000,
      timestamp: NOW,
    });

    const res = await verifyZKHolderProof(proof, {
      now: NOW + 20 * 60_000,
      maxAgeMs: 10 * 60_000,
    });
    expect(res.valid).toBe(false);
    expect(res.reason).toBe("proof_expired");
  });
});

