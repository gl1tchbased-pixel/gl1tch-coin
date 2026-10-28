import bs58 from "bs58";
import { parseMemo } from "./merkle.js";

/**
 * Safety policy for the attester, the one GL1TCH component that signs a transaction. Each check stands on its
 * own and refuses by returning a reason, so a bug in one layer is caught by the next:
 *   allowlist (one Memo instruction, attester only) → fee cap → simulated balance change → daily and per-run caps
 *   → wallet isolation → circuit breaker.
 * Everything here is pure, so every refusal path is unit-tested without a network.
 */

export const MEMO_PROGRAM_ID = "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr";

/** Genesis hash per cluster: the RPC must prove which chain it is, so a test setup can't sign on mainnet. */
export const CLUSTER_GENESIS = {
  devnet: "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG",
  "mainnet-beta": "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d",
} as const;
export type Cluster = keyof typeof CLUSTER_GENESIS;

export function checkCluster(cluster: Cluster, genesisHash: string): string | null {
  return genesisHash === CLUSTER_GENESIS[cluster] ? null : `ATTEST_RPC is not on ${cluster} (genesis ${genesisHash.slice(0, 8)}…)`;
}

export interface AttestPolicy {
  /** Max lamports one anchor may cost (base fee is 5,000 per signature; an anchor has one). */
  maxFeeLamports: number;
  /** Max anchors in any rolling 24 h: room for the 48 runs a day in degraded mode (2 each) plus normal sealing;
   *  at 5,000 lamports an anchor that is still at most 0.0005 SOL a day. */
  maxPerDay: number;
  /** Max anchors one run may send. */
  maxPerRun: number;
  /** Above this the wallet is fuller than a fee wallet needs: warn so the excess gets moved out. */
  warnWalletLamports: number;
  /** Hard ceiling: a wallet this full isn't a dedicated fee wallet, so refuse to sign. Set well above the warning
   *  level so halting the attester by gifting it SOL costs the attacker more than a token amount. */
  maxWalletLamports: number;
  /** Below this the wallet can't pay; stop and ask for a top-up. */
  minWalletLamports: number;
  /** Consecutive failures before the run halts. */
  maxConsecutiveFailures: number;
}

export const DEFAULT_POLICY: AttestPolicy = {
  maxFeeLamports: 10_000,
  maxPerDay: 100,
  maxPerRun: 6,
  warnWalletLamports: 250_000_000, // 0.25 SOL
  maxWalletLamports: 2_000_000_000, // 2 SOL
  minWalletLamports: 100_000,
  maxConsecutiveFailures: 3,
};

/** Env can only tighten the policy: a value above the default is ignored. */
export function policyFromEnv(env: Record<string, string | undefined>): AttestPolicy {
  const tighten = (name: string, def: number) => {
    const n = Number(env[name]);
    return Number.isFinite(n) && n > 0 ? Math.min(Math.floor(n), def) : def;
  };
  return {
    maxFeeLamports: tighten("ATTEST_MAX_FEE_LAMPORTS", DEFAULT_POLICY.maxFeeLamports),
    maxPerDay: tighten("ATTEST_MAX_PER_DAY", DEFAULT_POLICY.maxPerDay),
    maxPerRun: tighten("ATTEST_MAX_PER_RUN", DEFAULT_POLICY.maxPerRun),
    warnWalletLamports: tighten("ATTEST_WARN_WALLET_LAMPORTS", DEFAULT_POLICY.warnWalletLamports),
    maxWalletLamports: tighten("ATTEST_MAX_WALLET_LAMPORTS", DEFAULT_POLICY.maxWalletLamports),
    minWalletLamports: DEFAULT_POLICY.minWalletLamports,
    maxConsecutiveFailures: tighten("ATTEST_MAX_FAILURES", DEFAULT_POLICY.maxConsecutiveFailures),
  };
}

/** The compiled message, flattened to plain strings and bytes. */
export interface TxShape {
  accountKeys: string[];
  numRequiredSignatures: number;
  hasLookups: boolean;
  instructions: { programIndex: number; accounts: number[]; data: Uint8Array }[];
}

/** The memo text if `tx` is exactly one GL1TCH v1 memo, paid and signed by the attester alone; else null. */
export function anchorMemoOf(tx: TxShape, attester: string): string | null {
  if (tx.hasLookups || tx.numRequiredSignatures !== 1 || tx.accountKeys[0] !== attester) return null;
  if (tx.accountKeys.some((k) => k !== attester && k !== MEMO_PROGRAM_ID)) return null;
  if (tx.instructions.length !== 1) return null;
  const ix = tx.instructions[0];
  if (tx.accountKeys[ix.programIndex] !== MEMO_PROGRAM_ID) return null;
  // The memo may reference only the attester (the Memo program can't move funds; the program check above is the wall).
  if (ix.accounts.some((i) => tx.accountKeys[i] !== attester)) return null;
  const text = Buffer.from(ix.data).toString("utf8");
  return parseMemo(text) ? text : null;
}

/** Allowlist check before signing: null when `tx` is the expected anchor and nothing else, else the reason. */
export function checkAnchorTx(tx: TxShape, attester: string, expectedMemo: string): string | null {
  const memo = anchorMemoOf(tx, attester);
  if (memo === null) return "transaction is not a single attester-signed v1 memo";
  if (memo !== expectedMemo) return "memo text differs from the batch being anchored";
  return null;
}

export function checkFee(feeLamports: number | null, policy: AttestPolicy): string | null {
  if (feeLamports === null) return "fee unknown (blockhash expired?)";
  if (feeLamports > policy.maxFeeLamports) return `fee ${feeLamports} lamports exceeds cap ${policy.maxFeeLamports}`;
  return null;
}

/** Checks the signed transaction's simulation: it must succeed and cost the attester no more than the fee cap. */
export function checkSimulation(
  sim: { err: unknown; preLamports: number; postLamports: number | null },
  policy: AttestPolicy
): string | null {
  if (sim.err) return `simulation failed: ${JSON.stringify(sim.err).slice(0, 200)}`;
  if (sim.postLamports === null) return "simulation returned no balance for the attester";
  const spent = sim.preLamports - sim.postLamports;
  if (spent > policy.maxFeeLamports) return `simulated spend ${spent} lamports exceeds cap ${policy.maxFeeLamports}`;
  return null;
}

/** The attester's address, pinned in code: on mainnet the run signs with this key and no other, so pointing the
 *  secret at a different wallet (say, the founder's main one) takes a reviewed commit, not just a changed
 *  setting. To rotate, change it here and in src/lib/official.ts (a test keeps the two equal). */
export const PINNED_ATTESTER = "BSq18aJBhxYJgeEbcA3jGQNU1vmwZdo2PQkkpVsK7W6o";

/** What the attester signs to report an anchor to the bot (POST /attest/link). Only its key can make the proof,
 *  so the bot refuses forged reports without spending an RPC call. Plain text with a GL1TCH prefix: it can't
 *  double as a Solana transaction message, and nobody but the attester ever signs it. */
export function linkReportMessage(root: string, sig: string): string {
  return `gl1tch:attest-link:v1:${root}:${sig}`;
}

/** Signer identity: the secret's key must be the one named in ATTESTER_PUBKEY and, on mainnet, the pinned one. */
export function checkSigner(cluster: Cluster, signer: string, envPubkey: string | undefined): string | null {
  if (signer !== envPubkey?.trim()) return "ATTESTER_PUBKEY is missing or doesn't match the secret key";
  if (cluster === "mainnet-beta" && signer !== PINNED_ATTESTER) return `signer ${signer} is not the pinned attester ${PINNED_ATTESTER}`;
  return null;
}

/** Wallet balance: refuse a wallet that can't pay, or one far fuller than a fee wallet should ever be. Only the SOL
 *  balance counts. Token accounts don't: anyone can open one for any address or send it dust, so judging them
 *  would hand strangers a cheap way to halt sealing, and nothing in a token account can affect a memo-only signer.
 *  Which wallet this is gets settled by the pinned address instead. */
export function checkWallet(w: { lamports: number }, policy: AttestPolicy): string | null {
  if (w.lamports > policy.maxWalletLamports) return `attester wallet holds ${w.lamports} lamports, over the ${policy.maxWalletLamports} ceiling for a fee wallet`;
  if (w.lamports < policy.minWalletLamports) return `attester wallet is low (${w.lamports} lamports); top it up`;
  return null;
}

/** Worth a look, but not a reason to stop: a stranger can cause it by sending SOL. */
export function walletWarnings(w: { lamports: number }, policy: AttestPolicy): string[] {
  return w.lamports > policy.warnWalletLamports
    ? [`attester wallet holds ${w.lamports} lamports, more than a fee wallet needs; move the excess out`]
    : [];
}

/** Anchors per run when the last 24 h couldn't be read or counted: with the schedule in attest.yml a whole day of
 *  such runs stays under maxPerDay even if the count is off, and still keeps up with new sweeps (one per run). */
export const DEGRADED_PER_RUN = 2;

/** How many anchors this run may send. */
export function runBudget(s: { sentLast24h: number; historyComplete: boolean }, policy: AttestPolicy): number {
  const left = Math.max(0, policy.maxPerDay - s.sentLast24h);
  return Math.min(policy.maxPerRun, s.historyComplete ? policy.maxPerRun : DEGRADED_PER_RUN, left);
}

export function checkDaily(sentLast24h: number, policy: AttestPolicy): string | null {
  return sentLast24h >= policy.maxPerDay ? `daily cap reached (${sentLast24h}/${policy.maxPerDay})` : null;
}

/** Halts the run after too many consecutive failures; any success resets the count. */
export class CircuitBreaker {
  private fails = 0;
  constructor(private readonly max: number) {}
  fail(): void {
    this.fails++;
  }
  ok(): void {
    this.fails = 0;
  }
  get open(): boolean {
    return this.fails >= this.max;
  }
}

/** Reads the attester secret: base58 (wallet export) or a JSON byte array (solana-keygen). Errors never echo it. */
export function parseSecretKey(raw: string | undefined): Uint8Array {
  if (!raw || !raw.trim()) throw new Error("ATTESTER_SECRET_KEY is not set");
  const s = raw.trim();
  let bytes: Uint8Array;
  try {
    if (s.startsWith("[")) {
      const arr: unknown = JSON.parse(s);
      if (!Array.isArray(arr) || !arr.every((n) => Number.isInteger(n) && n >= 0 && n <= 255)) throw new Error();
      bytes = Uint8Array.from(arr as number[]);
    } else {
      bytes = bs58.decode(s);
    }
  } catch {
    throw new Error("ATTESTER_SECRET_KEY is neither base58 nor a JSON byte array");
  }
  if (bytes.length !== 64) throw new Error("ATTESTER_SECRET_KEY must be a 64-byte secret key");
  return bytes;
}
