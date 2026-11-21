/**
 * Can the Solana receive wallet take a USDC payment right now? An x402 payment on Solana is a plain USDC transfer
 * into the receiver's existing token account; it never creates one. If that account is closed (it was, on
 * 31 Oct 2026), every Solana payment fails verification while the 402 keeps offering Solana. So the paid routes
 * offer Solana only while the account exists, and /api/x402/health reports it when it doesn't.
 *
 * Unknown (RPC down or slow) counts as receivable: an RPC hiccup must not drop a working network.
 */

import { solanaRpc } from "@/lib/scan";

export const USDC_SOLANA_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const TTL_MS = 10 * 60_000;

type Rpc = <T>(method: string, params: unknown[], signal?: AbortSignal) => Promise<T>;

let memo: { owner: string; ok: boolean; at: number } | null = null;
let warned = false;

/** true / false from the chain; null when the chain couldn't be read. */
export async function readSolanaReceivable(owner: string, rpc: Rpc = solanaRpc): Promise<boolean | null> {
  try {
    const r = await rpc<{ value?: unknown[] }>(
      "getTokenAccountsByOwner",
      [owner, { mint: USDC_SOLANA_MINT }, { encoding: "jsonParsed" }],
      AbortSignal.timeout(4000),
    );
    return Array.isArray(r?.value) ? r.value.length > 0 : null;
  } catch {
    return null;
  }
}

/** Cached 10 min per server instance. Logs once when the account goes missing. */
export async function solanaCanReceive(owner: string, rpc: Rpc = solanaRpc, now = Date.now()): Promise<boolean> {
  if (memo && memo.owner === owner && now - memo.at < TTL_MS) return memo.ok;
  const read = await readSolanaReceivable(owner, rpc);
  const ok = read ?? memo?.ok ?? true;
  if (read !== null) memo = { owner, ok, at: now };
  if (!ok && !warned) {
    warned = true;
    console.error(`[x402] Solana receive wallet ${owner} has no USDC token account: Solana is not offered until it has one`);
  }
  if (ok) warned = false;
  return ok;
}

/** Test hook. */
export function resetReceivableCache(): void {
  memo = null;
  warned = false;
}
