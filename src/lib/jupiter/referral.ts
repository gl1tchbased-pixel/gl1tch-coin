import { PublicKey } from "@solana/web3.js";

export const JUP_REFERRAL_PROGRAM_ID = new PublicKey("REFER4ZgmyYx9c6He5XfaTMiGfdLwRnkV4RPp9t9iF3");
/** The Jupiter project behind the /swap/v2/order API that Safe Swap uses. */
export const JUP_ULTRA_PROJECT = new PublicKey("DkiqsTrw1u1bYFumumC7sCG2S8K25qc2vemJFHyW2wJc");
export const WSOL_MINT = new PublicKey("So11111111111111111111111111111111111111112");
const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");

const encoder = new TextEncoder();

export function referralAccountAddress(name: string, project: PublicKey = JUP_ULTRA_PROJECT): PublicKey {
  return PublicKey.findProgramAddressSync(
    [encoder.encode("referral"), project.toBuffer(), encoder.encode(name)],
    JUP_REFERRAL_PROGRAM_ID
  )[0];
}

/** Where Jupiter pays the fee: the referral account's associated token account (the program's V2 layout).
 *  The older "referral_ata" PDA isn't read by the order API: with only that, an order quietly carries no fee. */
export function referralVaultAddress(referralAccount: PublicKey, mint: PublicKey = WSOL_MINT): PublicKey {
  return PublicKey.findProgramAddressSync(
    [referralAccount.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID
  )[0];
}

export interface ReferralAccountState {
  partner: string;
  project: string;
  shareBps: number;
}

/** Layout: 8-byte discriminator, partner, project, share_bps. The partner is whoever owns the fees. */
export function parseReferralAccount(data: Uint8Array): ReferralAccountState | null {
  if (data.length < 74) return null;
  return {
    partner: new PublicKey(data.subarray(8, 40)).toBase58(),
    project: new PublicKey(data.subarray(40, 72)).toBase58(),
    shareBps: new DataView(data.buffer, data.byteOffset).getUint16(72, true),
  };
}
