import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { createMint } from "@solana/spl-token";
import { config } from "../config.js";

/**
 * Create the $GL1TCH SPL mint.
 * mintAuthority and freezeAuthority start as the fee payer, then are REVOKED
 * after the full supply is minted (see revokeAuthorities.ts).
 *
 * Uses the legacy SPL Token program (not Token-2022) for maximum compatibility.
 */
export async function createGl1tchMint(
  connection: Connection,
  payer: Keypair
): Promise<PublicKey> {
  const mint = await createMint(
    connection,
    payer,
    payer.publicKey, // mint authority (revoked later)
    payer.publicKey, // freeze authority (revoked later)
    config.token.decimals
  );
  return mint;
}
