import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { AuthorityType, setAuthority } from "@solana/spl-token";

/**
 * Revoke mint AND freeze authority by setting them to null.
 * Run ONLY after the full supply has been minted. Irreversible.
 */
export async function revokeAuthorities(
  connection: Connection,
  payer: Keypair,
  mint: PublicKey,
  currentAuthority: Keypair
): Promise<{ mintSig: string; freezeSig: string }> {
  const mintSig = await setAuthority(
    connection,
    payer,
    mint,
    currentAuthority,
    AuthorityType.MintTokens,
    null
  );

  const freezeSig = await setAuthority(
    connection,
    payer,
    mint,
    currentAuthority,
    AuthorityType.FreezeAccount,
    null
  );

  return { mintSig, freezeSig };
}
