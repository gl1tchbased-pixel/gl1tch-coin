import { describe, it, expect } from "vitest";
import { PublicKey } from "@solana/web3.js";
import {
  getReferralAccountPda,
  getReferralTokenAccountPda,
  buildInitializeReferralAccountWithNameIx,
  buildInitializeReferralTokenAccountIx,
  JUP_REFERRAL_PROGRAM_ID,
  JUP_SWAP_PROJECT_PUBKEY,
  WSOL_MINT,
  USDC_MINT,
  DEFAULT_REFERRAL_NAME,
} from "./referral";

describe("Jupiter Referral Library", () => {
  it("derives deterministic Referral Account PDA for GL1TCH", () => {
    const [pda, bump] = getReferralAccountPda(DEFAULT_REFERRAL_NAME);
    expect(pda.toBase58()).toBe("EFP5EHXwkBScaVwCkBHkr9sc2wYsKRathmB1zJmfhpS2");
    expect(bump).toBe(255);
  });

  it("derives deterministic WSOL and USDC token vault PDAs", () => {
    const [referralPda] = getReferralAccountPda(DEFAULT_REFERRAL_NAME);
    const [wsolAta, wsolBump] = getReferralTokenAccountPda(referralPda, WSOL_MINT);
    const [usdcAta, usdcBump] = getReferralTokenAccountPda(referralPda, USDC_MINT);

    expect(wsolAta.toBase58()).toBe("6neDjK1KFiymmRG9mfbJUBDB7HaRr3xoTbbhfpNk334L");
    expect(wsolBump).toBe(252);
    expect(usdcAta.toBase58()).toBeDefined();
    expect(usdcBump).toBeGreaterThanOrEqual(0);
  });

  it("builds valid initializeReferralAccountWithName instruction", () => {
    const payer = new PublicKey("H5qbtquJzLVrwYj5opedoQCy9edQQZAtiyPMTMFFaFb4");
    const ix = buildInitializeReferralAccountWithNameIx({ payer });

    expect(ix.programId.toBase58()).toBe(JUP_REFERRAL_PROGRAM_ID.toBase58());
    expect(ix.keys).toHaveLength(5);
    expect(ix.keys[0].pubkey.toBase58()).toBe(payer.toBase58());
    expect(ix.keys[0].isSigner).toBe(true);
    expect(ix.keys[1].pubkey.toBase58()).toBe(payer.toBase58()); // partner
    expect(ix.keys[2].pubkey.toBase58()).toBe(JUP_SWAP_PROJECT_PUBKEY.toBase58()); // project
    expect(ix.keys[3].pubkey.toBase58()).toBe("EFP5EHXwkBScaVwCkBHkr9sc2wYsKRathmB1zJmfhpS2"); // referralAccount PDA
    expect(ix.data.subarray(0, 8).toString("hex")).toBe("f1be6b1af4ec77e5"); // anchor sighash
  });

  it("builds valid initializeReferralTokenAccount instruction", () => {
    const payer = new PublicKey("H5qbtquJzLVrwYj5opedoQCy9edQQZAtiyPMTMFFaFb4");
    const [referralPda] = getReferralAccountPda(DEFAULT_REFERRAL_NAME);
    const ix = buildInitializeReferralTokenAccountIx({
      payer,
      referralAccount: referralPda,
      mint: WSOL_MINT,
    });

    expect(ix.programId.toBase58()).toBe(JUP_REFERRAL_PROGRAM_ID.toBase58());
    expect(ix.keys).toHaveLength(7);
    expect(ix.keys[0].pubkey.toBase58()).toBe(payer.toBase58());
    expect(ix.keys[2].pubkey.toBase58()).toBe(referralPda.toBase58());
    expect(ix.data.subarray(0, 8).toString("hex")).toBe("7d12465f56b3ddbe"); // anchor sighash
  });
});

