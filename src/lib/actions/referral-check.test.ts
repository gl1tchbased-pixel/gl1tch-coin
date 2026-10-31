import { describe, it, expect } from "vitest";
import { PublicKey } from "@solana/web3.js";
import { feeRouteProblem } from "./referral-check";
import { JUP_ULTRA_PROJECT } from "@/lib/jupiter/referral";
import { ATTESTER_WALLET, REFERRAL_PARTNER } from "@/lib/official";

const vault = { data: new Uint8Array(165) };

function referral(partner: string, opts: { project?: PublicKey; shareBps?: number } = {}) {
  const data = new Uint8Array(274);
  data.set(new PublicKey(partner).toBytes(), 8);
  data.set((opts.project ?? JUP_ULTRA_PROJECT).toBytes(), 40);
  new DataView(data.buffer).setUint16(72, opts.shareBps ?? 8000, true);
  return { data };
}

describe("feeRouteProblem", () => {
  it("never lets a fee flow to the attester, whose key lives in CI", () => {
    expect(feeRouteProblem(referral(ATTESTER_WALLET), vault)).toBeTruthy();
  });

  it("stops the fee when the owner isn't the pinned wallet", () => {
    expect(feeRouteProblem(referral("H5qbtquJzLVrwYj5opedoQCy9edQQZAtiyPMTMFFaFb4"), vault)).toMatch(/pinned/);
  });

  it("stops the fee when the account is missing or unreadable", () => {
    expect(feeRouteProblem(null, vault)).toMatch(/missing/);
    expect(feeRouteProblem({ data: new Uint8Array(10) }, vault)).toMatch(/unreadable/);
  });

  // REFERRAL_PARTNER equals the attester until the founder moves the account, so this runs only after that.
  it.skipIf(REFERRAL_PARTNER === ATTESTER_WALLET)("passes a healthy route and catches a lowered share or missing vault", () => {
    expect(feeRouteProblem(referral(REFERRAL_PARTNER), vault)).toBeNull();
    expect(feeRouteProblem(referral(REFERRAL_PARTNER, { shareBps: 100 }), vault)).toMatch(/share/);
    expect(feeRouteProblem(referral(REFERRAL_PARTNER), null)).toMatch(/vault/);
  });
});
