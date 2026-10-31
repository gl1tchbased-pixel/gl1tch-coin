import { PublicKey } from "@solana/web3.js";
import { ATTESTER_WALLET, REFERRAL_ACCOUNT, REFERRAL_PARTNER } from "@/lib/official";
import { JUP_ULTRA_PROJECT, parseReferralAccount, referralVaultAddress } from "@/lib/jupiter/referral";
import { SOLANA_RPC } from "@/lib/wallet/rpc";

const CACHE_MS = 60_000;
const MIN_SHARE_BPS = 8000;

type AccountRead = { data: Uint8Array } | null;

/** Pure: may a fee flow into this referral account? Any doubt means no fee; the user's swap still runs. */
export function feeRouteProblem(referral: AccountRead, vault: AccountRead): string | null {
  if (!referral) return "referral account missing";
  const state = parseReferralAccount(referral.data);
  if (!state) return "referral account unreadable";
  if (state.partner !== REFERRAL_PARTNER) return "referral owner is not the pinned wallet";
  // Its key sits in CI secrets to sign memos. Same rule as readPayTo: revenue must never land there.
  if (state.partner === ATTESTER_WALLET) return "referral owner is the attester";
  if (state.project !== JUP_ULTRA_PROJECT.toBase58()) return "referral account is on another project";
  if (state.shareBps < MIN_SHARE_BPS) return "referral share was lowered";
  if (!vault) return "fee vault not opened";
  return null;
}

async function readAccounts(rpc: string, addresses: string[]): Promise<AccountRead[]> {
  const res = await fetch(rpc, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getMultipleAccounts", params: [addresses, { encoding: "base64" }] }),
    signal: AbortSignal.timeout(4000),
  });
  const json = (await res.json()) as { result?: { value?: Array<{ data: [string, string] } | null> } };
  if (!json.result?.value) throw new Error("no accounts in the RPC answer");
  return json.result.value.map((a) => (a ? { data: Buffer.from(a.data[0], "base64") } : null));
}

let cached: { at: number; problem: string | null } | null = null;

/** The on-chain state behind the fee, read at most once a minute. An RPC failure counts as a problem. */
export async function referralFeeProblem(): Promise<string | null> {
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.problem;
  let problem: string | null;
  try {
    const vault = referralVaultAddress(new PublicKey(REFERRAL_ACCOUNT)).toBase58();
    const [referral, vaultAccount] = await readAccounts(process.env.SCAN_RPC || SOLANA_RPC, [REFERRAL_ACCOUNT, vault]);
    problem = feeRouteProblem(referral, vaultAccount);
  } catch {
    problem = "could not read the referral account";
  }
  if (problem) console.warn(`[safe-swap] no fee: ${problem}`);
  cached = { at: Date.now(), problem };
  return problem;
}
