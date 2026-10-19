// Live status of the public give-back wallet, so the site never implies payouts that haven't
// happened: copy is built from the wallet's real balance and transaction count.
import { GIVEBACK_WALLET } from "@/lib/official";
import { solanaRpc } from "@/lib/scan";

export interface GivebackStatus { sol: number; txs: number; more: boolean; at: number }

const TTL_MS = 10 * 60_000;
const PAGE = 100;
let memo: GivebackStatus | null = null;

/** Balance + transaction count (first 100), cached 10 min per server instance. Null if unreachable. */
export async function givebackStatus(): Promise<GivebackStatus | null> {
  if (!GIVEBACK_WALLET) return null;
  if (memo && Date.now() - memo.at < TTL_MS) return memo;
  try {
    const signal = AbortSignal.timeout(4000);
    const [bal, sigs] = await Promise.all([
      solanaRpc<{ value: number }>("getBalance", [GIVEBACK_WALLET], signal),
      solanaRpc<unknown[]>("getSignaturesForAddress", [GIVEBACK_WALLET, { limit: PAGE }], signal),
    ]);
    memo = { sol: bal.value / 1e9, txs: sigs.length, more: sigs.length >= PAGE, at: Date.now() };
    return memo;
  } catch {
    // keep showing the last known status rather than none
    return memo;
  }
}

const solText = (sol: number) => (sol >= 1 ? sol.toFixed(2) : sol >= 0.01 ? sol.toFixed(3) : sol > 0 ? "<0.01" : "0");

/** Short (table note) and long (card) wording for a status; null means the chain wasn't readable. */
export function givebackCopy(s: GivebackStatus | null): { short: string; long: string } {
  if (!s) return { short: "Public · readable on Solscan", long: "Public and on-chain: check its balance and every transaction on Solscan." };
  if (s.txs === 0) {
    return {
      short: "Not funded yet · 0 transactions",
      long: "Set up and public, not funded yet: 0 SOL and no transactions so far. Once it pays out, every transfer is a transaction you can read on Solscan.",
    };
  }
  const n = `${s.txs}${s.more ? "+" : ""} transaction${s.txs === 1 ? "" : "s"}`;
  return { short: `${n} · ${solText(s.sol)} SOL`, long: `${n} so far and ${solText(s.sol)} SOL in the wallet now. Every transfer is readable on Solscan.` };
}
