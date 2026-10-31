import { describe, it, expect } from "vitest";
import { PublicKey } from "@solana/web3.js";
import { JUP_ULTRA_PROJECT, parseReferralAccount, referralAccountAddress, referralVaultAddress } from "./referral";
import { REFERRAL_ACCOUNT, REFERRAL_NAME } from "@/lib/official";

describe("Jupiter referral addresses", () => {
  it("derives the pinned referral account from the project and name", () => {
    expect(referralAccountAddress(REFERRAL_NAME).toBase58()).toBe(REFERRAL_ACCOUNT);
  });

  it("derives the vault the order API reads, not the older referral_ata PDA", () => {
    const vault = referralVaultAddress(new PublicKey(REFERRAL_ACCOUNT)).toBase58();
    expect(vault).toBe("DqKd8TtLf9m8dkg81K6XNVg5CGB9uMHVSQKQn9qNjYTU");
    expect(vault).not.toBe("AM3ZVyrHebaHJ8jo2wKXMKk4qMEkd2Dsdg1MvxtW8hrW");
  });
});

describe("parseReferralAccount", () => {
  const partner = new PublicKey("H5qbtquJzLVrwYj5opedoQCy9edQQZAtiyPMTMFFaFb4");

  it("reads the owner, project and share", () => {
    const data = new Uint8Array(274);
    data.set(partner.toBytes(), 8);
    data.set(JUP_ULTRA_PROJECT.toBytes(), 40);
    new DataView(data.buffer).setUint16(72, 8000, true);
    expect(parseReferralAccount(data)).toEqual({ partner: partner.toBase58(), project: JUP_ULTRA_PROJECT.toBase58(), shareBps: 8000 });
  });

  it("refuses data too short to be a referral account", () => {
    expect(parseReferralAccount(new Uint8Array(40))).toBeNull();
  });
});
