/** The exact message a holder signs to prove wallet ownership for a given nonce.
 *  MUST stay byte-identical to the website's src/lib/verify.ts::verificationMessage —
 *  a cross-surface test guards this. Kept crypto-free so it can be imported anywhere. */
export function verificationMessage(nonce: string): string {
  return `GL1TCH // verify rank\n\nSign this message to link your wallet. This is free, off-chain, and grants no spending access.\n\nNonce: ${nonce}`;
}
