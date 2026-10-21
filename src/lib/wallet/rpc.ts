// Browser Solana RPC, shared by the wallet engine and the light balance read below. Always key-less:
// a NEXT_PUBLIC_ value ships in the page's JavaScript, so a keyed RPC (Helius etc.) set there was
// readable by every visitor. Keyed RPCs stay server-side (SCAN_RPC). publicnode is free and
// CORS-enabled; the canonical api.mainnet-beta.solana.com blocks cross-origin browser requests.
export const SOLANA_RPC = "https://solana-rpc.publicnode.com";

/**
 * $GL1TCH balance held by `owner`, summed over all its token accounts (Token-2022 included). Read
 * through our own /api/balance: key-less public RPCs refuse getTokenAccountsByOwner from browsers.
 */
export async function gl1tchBalance(owner: string, signal?: AbortSignal): Promise<number> {
  const res = await fetch(`/api/balance?owner=${encodeURIComponent(owner)}`, { signal });
  const j = (await res.json().catch(() => ({}))) as { balance?: number; error?: string };
  if (!res.ok || typeof j.balance !== "number") throw new Error(j.error || `balance ${res.status}`);
  return j.balance;
}
