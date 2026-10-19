// Live $GL1TCH balance of the token's deployer wallet, so the site's disclosure can't go stale:
// it said "fully exited" for weeks after the wallet had bought back in.
import { CONTRACT_ADDRESS, DEPLOYER_WALLET } from "@/lib/official";
import { solanaRpc } from "@/lib/scan";
import { formatHoldingPct, holdingPct } from "@/lib/deployer-holdings";

export interface DeployerStatus { tokens: number; pct: number; at: number }

/** The two on-chain events the disclosure is built on (receipts for the Proof page). */
export const DEPLOYER_EVENTS = {
  exit: {
    date: "2026-08-20",
    tx: "https://solscan.io/tx/5p6HLidcvfW1stiCvRPE3qBrv4F2SfN9mxXgsmpAytXHWSqbv6NhjCMdBdwtbGM7cyu7YkcwHuqa3cLsWCY2f3PV",
  },
  buyback: {
    dates: "17–19 Oct 2026",
    firstTx: "https://solscan.io/tx/4SC9v2AuRpe7swb5knijnzZNZmwbUsXE4XmjGqxFKfpf5V1tvpyfPJ7x42pFa8SWKVn2kLLDG1sTFXguiQeyG65t",
  },
} as const;

const TTL_MS = 10 * 60_000;
let memo: DeployerStatus | null = null;

/** Balance + share of supply, cached 10 min per server instance. Null if the chain wasn't readable. */
export async function deployerStatus(): Promise<DeployerStatus | null> {
  if (memo && Date.now() - memo.at < TTL_MS) return memo;
  try {
    const signal = AbortSignal.timeout(4000);
    const [accts, supply] = await Promise.all([
      solanaRpc<{ value: Array<{ account?: { data?: { parsed?: { info?: { tokenAmount?: { uiAmount?: number | null } } } } } }> }>(
        "getTokenAccountsByOwner",
        [DEPLOYER_WALLET, { mint: CONTRACT_ADDRESS }, { encoding: "jsonParsed" }],
        signal,
      ),
      solanaRpc<{ value: { uiAmount: number | null } }>("getTokenSupply", [CONTRACT_ADDRESS], signal),
    ]);
    const tokens = (accts.value ?? []).reduce((s, a) => s + Number(a.account?.data?.parsed?.info?.tokenAmount?.uiAmount ?? 0), 0);
    const pct = holdingPct(tokens, supply.value?.uiAmount ?? null);
    if (pct == null) return memo;
    memo = { tokens, pct, at: Date.now() };
    return memo;
  } catch {
    // keep showing the last known status rather than none
    return memo;
  }
}

const tokenText = (n: number) =>
  n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${Math.round(n / 1e3)}K` : String(Math.round(n));

/** Short (wallet-row note) and inline (sentence fragment) wording; null means the chain wasn't readable. */
export function deployerCopy(s: DeployerStatus | null): { short: string; now: string } {
  if (!s) return { short: "Who created the token — inspect its history", now: "check its current balance on Solscan" };
  if (s.tokens === 0) return { short: "Holds 0 GL1TCH right now (live)", now: "holds none right now" };
  const share = formatHoldingPct(s.pct);
  return {
    short: `Holds ${share} of supply right now (live)`,
    now: `holds ${tokenText(s.tokens)} GL1TCH (${share} of supply) right now, read live from the chain`,
  };
}
