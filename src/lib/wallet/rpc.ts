// Browser Solana RPC, shared by the wallet engine and the light balance read below.
// The canonical api.mainnet-beta.solana.com blocks cross-origin browser requests (CORS), so the
// fallback is publicnode: free, key-less and CORS-enabled.
const FALLBACK_RPC = "https://solana-rpc.publicnode.com";
const env = process.env.NEXT_PUBLIC_SOLANA_RPC?.trim();
export const SOLANA_RPC = env && /^https?:\/\//.test(env) ? env : FALLBACK_RPC;

/**
 * UI-amount balance of `mint` held by `owner`, summed over all its token accounts (works for
 * Token-2022 too). One JSON-RPC call; no @solana/web3.js needed.
 */
export async function tokenBalance(owner: string, mint: string, signal?: AbortSignal): Promise<number> {
  const res = await fetch(SOLANA_RPC, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getTokenAccountsByOwner", params: [owner, { mint }, { encoding: "jsonParsed" }] }),
    signal,
  });
  if (!res.ok) throw new Error(`rpc ${res.status}`);
  const j = (await res.json()) as { result?: { value?: { account?: { data?: { parsed?: { info?: { tokenAmount?: { uiAmount?: number | null } } } } } }[] }; error?: { message?: string } };
  if (j.error) throw new Error(j.error.message || "rpc error");
  return (j.result?.value ?? []).reduce((sum, a) => sum + (a.account?.data?.parsed?.info?.tokenAmount?.uiAmount ?? 0), 0);
}
