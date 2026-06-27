import { Connection, PublicKey } from "@solana/web3.js";

/** Read a wallet's total $GL1TCH UI balance across its token accounts (read-only). */
export async function readTokenBalance(
  connection: Connection,
  owner: string,
  mint: string
): Promise<number> {
  const res = await connection.getParsedTokenAccountsByOwner(new PublicKey(owner), {
    mint: new PublicKey(mint),
  });
  let total = 0;
  for (const { account } of res.value) {
    const amt = account.data.parsed?.info?.tokenAmount?.uiAmount;
    if (typeof amt === "number") total += amt;
  }
  return total;
}
