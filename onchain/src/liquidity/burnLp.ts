import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { burn, getAccount } from "@solana/spl-token";

/**
 * Self-managed liquidity path only. After creating a Raydium/Meteora pool, burn
 * the LP tokens to prove liquidity can never be pulled (rug-proof).
 *
 * For the default Pump.fun launch this is NOT needed — Pump.fun handles the
 * bonding curve and auto-migrates liquidity to Raydium at the threshold.
 */
export async function burnAllLp(
  connection: Connection,
  payer: Keypair,
  lpMint: PublicKey,
  lpTokenAccount: PublicKey,
  owner: Keypair
): Promise<string> {
  const acct = await getAccount(connection, lpTokenAccount);
  if (acct.amount === 0n) {
    throw new Error("LP token account is empty — nothing to burn.");
  }
  return burn(connection, payer, lpTokenAccount, lpMint, owner, acct.amount);
}
