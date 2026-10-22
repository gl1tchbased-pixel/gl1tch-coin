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
  /** Max anchors in any rolling 24 h (48 sweeps a day plus headroom). */
  maxPerDay: number;
  /** Max anchors one run may send. */
  maxPerRun: number;
  /** A fuller wallet isn't a dedicated fee wallet: refuse to sign with it. */
  maxWalletLamports: number;
  /** Below this the wallet can't pay; stop and ask for a top-up. */
  minWalletLamports: number;
  /** Consecutive failures before the run halts. */
  maxConsecutiveFailures: number;
}

export const DEFAULT_POLICY: AttestPolicy = {
  maxFeeLamports: 10_000,
  maxPerDay: 60,
  maxPerRun: 6,
  maxWalletLamports: 250_000_000, // 0.25 SOL
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

/** Wallet isolation: the attester must be a small, dedicated fee wallet. */
export function checkWallet(w: { lamports: number; tokenAccounts: number }, policy: AttestPolicy): string | null {
  if (w.tokenAccounts > 0) return "attester wallet holds token accounts; use a dedicated fee-only wallet";
  if (w.lamports > policy.maxWalletLamports) return `attester wallet holds ${w.lamports} lamports, over the ${policy.maxWalletLamports} cap for a fee wallet`;
  if (w.lamports < policy.minWalletLamports) return `attester wallet is low (${w.lamports} lamports); top it up`;
  return null;
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
