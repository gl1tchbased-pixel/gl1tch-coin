/**
 * Central input validation (Phase -1, PREMIUM-PLAN-v3). Every public endpoint validates
 * user/URL input HERE before touching it — no address/query is ever passed raw into a
 * server-side fetch (SSRF guard) or an RPC/DB call. Reject early, reject loudly.
 */

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/; // Solana mint / account
const EVM = /^0x[0-9a-fA-F]{40}$/; // EVM token / wallet
const CHAINS = new Set(["solana", "ethereum", "bsc", "base", "arbitrum", "polygon", "optimism", "avalanche"]);
// eslint-disable-next-line no-control-regex
const CONTROL = new RegExp("[\u0000-\u001f\u007f]", "g");

export const isSolAddress = (s: string) => BASE58.test(s);
export const isEvmAddress = (s: string) => EVM.test(s);
export const isAddress = (s: string) => isSolAddress(s) || isEvmAddress(s);
export const isChain = (s: string) => CHAINS.has(s.toLowerCase());

/** Normalize + validate a token/chain scan request. Returns null if invalid (caller 400s). */
export function parseScanInput(raw: { mint?: string | null; chain?: string | null; q?: string | null }):
  | { kind: "scan"; mint: string; chain: string }
  | { kind: "search"; q: string }
  | null {
  const mint = (raw.mint ?? "").trim();
  const chain = (raw.chain ?? "").trim().toLowerCase();
  const q = (raw.q ?? "").trim();

  if (q && !mint) {
    // Free-text search — cap length + strip control chars; downstream only hits our own APIs.
    if (q.length < 1 || q.length > 64) return null;
    return { kind: "search", q: q.replace(CONTROL, "").slice(0, 64) };
  }
  if (!mint) return null;
  if (!isAddress(mint)) return null; // must be a real Solana/EVM address
  if (chain && !isChain(chain)) return null; // chain, if given, must be known
  return { kind: "scan", mint, chain: chain || "" };
}
