import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import {
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";
import { config } from "../config.js";

/**
 * Mint the entire fixed supply to the treasury, once. After this, the mint
 * authority is revoked so no more tokens can ever be created.
 */
export async function mintFullSupply(
  connection: Connection,
  payer: Keypair,
  mint: PublicKey,
  treasury: PublicKey
): Promise<string> {
  const ata = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    mint,
    treasury
  );

  const rawAmount =
    BigInt(config.token.totalSupply) * 10n ** BigInt(config.token.decimals);

  const sig = await mintTo(
    connection,
    payer,
    mint,
    ata.address,
    payer, // current mint authority
    rawAmount
  );
  return sig;
}
