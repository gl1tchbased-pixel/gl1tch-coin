import bs58 from "bs58";
import { memoText, parseMemo, verifyProof, type ProofStep, type VerdictRecord } from "./merkle";

/**
 * In-browser verification of a sealed verdict (A3). Runs on the visitor's device against a Solana RPC of their
 * choice, so nothing rests on GL1TCH's servers: the proof is recomputed locally and the seal is read straight from
 * the chain. Mirrors the bot's checks (bot/src/attest/guard.ts) on the RPC's JSON transaction shape.
 */

export const MEMO_PROGRAM_ID = "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr";

export interface Anchor {
  sig: string;
  slot: number;
  blockTime: number | null;
}

/** One verdict as the proof endpoint serves it (and as a downloaded proof file stores it). */
export interface ProofEntry {
  record: VerdictRecord;
  proof: ProofStep[];
  root: string;
  count: number;
  sweepMs: number;
  anchor: Anchor | null;
}

/** `getTransaction` with `encoding: "json"`: only the fields the check reads. */
export interface RpcTx {
  slot: number;
  blockTime?: number | null;
  meta: { err: unknown } | null;
  transaction: {
    message: {
      accountKeys: string[];
      header: { numRequiredSignatures: number };
      instructions: { programIdIndex: number; accounts: number[]; data: string }[];
      addressTableLookups?: unknown[] | null;
    };
  };
}

export interface Check {
  key: string;
  label: string;
  ok: boolean;
  detail: string;
}

export interface Verification {
  checks: Check[];
  /** Every check passed, the seal included. */
  verified: boolean;
  /** The proof matches but there is no seal to check yet. */
  pendingSeal: boolean;
  /** The RPC couldn't be read, so the seal is unchecked (not disproven). */
  rpcUnreachable?: boolean;
}

/** The memo text if `tx` is exactly one GL1TCH v1 memo, paid and signed by `attester` alone; else null. */
export function anchorMemoOf(tx: RpcTx, attester: string): string | null {
  const msg = tx.transaction?.message;
  if (!msg || msg.addressTableLookups?.length) return null;
  if (msg.header.numRequiredSignatures !== 1 || msg.accountKeys[0] !== attester) return null;
  if (msg.accountKeys.some((k) => k !== attester && k !== MEMO_PROGRAM_ID)) return null;
  if (msg.instructions.length !== 1) return null;
  const ix = msg.instructions[0];
  if (msg.accountKeys[ix.programIdIndex] !== MEMO_PROGRAM_ID) return null;
  if (ix.accounts.some((i) => msg.accountKeys[i] !== attester)) return null;
  let text: string;
  try {
    text = new TextDecoder().decode(bs58.decode(ix.data));
  } catch {
    return null;
  }
  return parseMemo(text) ? text : null;
}

/** Fetches a finalized transaction over JSON-RPC (null if the node doesn't have it at that commitment). */
export async function fetchFinalizedTx(rpcUrl: string, sig: string, signal?: AbortSignal): Promise<RpcTx | null> {
  const res = await fetch(rpcUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "getTransaction",
      params: [sig, { encoding: "json", commitment: "finalized", maxSupportedTransactionVersion: 0 }],
    }),
    signal,
  });
  if (!res.ok) throw new Error(`RPC answered ${res.status}`);
  const j = (await res.json()) as { result?: RpcTx | null; error?: { message?: string } };
  if (j.error) throw new Error(j.error.message ?? "RPC error");
  return j.result ?? null;
}

const short = (s: string) => (s.length > 20 ? `${s.slice(0, 10)}…${s.slice(-8)}` : s);
const when = (sec: number) => new Date(sec * 1000).toISOString().replace(".000Z", "Z");

/**
 * Verifies one verdict end to end. `attester` is the address pinned in this site's source; when it's empty, sealing
 * isn't live yet and only the proof is checked. `getTx` defaults to reading `rpcUrl` from the browser.
 */
export async function verifyEntry(
  entry: ProofEntry,
  opts: { attester: string; rpcUrl: string; getTx?: (sig: string) => Promise<RpcTx | null> }
): Promise<Verification> {
  const checks: Check[] = [];
  const inRoot = verifyProof(entry.record, entry.proof, entry.root);
  checks.push({
    key: "proof",
    label: "This verdict hashes into the sweep's Merkle root",
    ok: inRoot,
    detail: inRoot ? `root ${short(entry.root)} · ${entry.count} verdicts in the sweep` : "proof does not lead to the root: the record or proof was altered",
  });

  if (!entry.anchor || !opts.attester) {
    checks.push({
      key: "sealed",
      label: "Sealed on Solana",
      ok: false,
      detail: !opts.attester
        ? "on-chain sealing isn't live yet: this verdict is recorded and provable, the Solana seal comes once the attester goes live"
        : "not sealed yet: the attester seals sweeps within about an hour",
    });
    return { checks, verified: false, pendingSeal: inRoot };
  }

  let tx: RpcTx | null = null;
  let rpcError = "";
  try {
    tx = await (opts.getTx ?? ((sig: string) => fetchFinalizedTx(opts.rpcUrl, sig, AbortSignal.timeout(15_000))))(entry.anchor.sig);
  } catch (e) {
    rpcError = e instanceof Error ? e.message : String(e);
  }
  const landed = !!tx && !!tx.meta && !tx.meta.err;
  checks.push({
    key: "finalized",
    label: "The seal transaction is finalized on Solana",
    ok: landed,
    detail: landed
      ? `slot ${tx!.slot}${tx!.blockTime ? ` · ${when(tx!.blockTime)}` : ""} · tx ${short(entry.anchor.sig)}`
      : rpcError
        ? `couldn't read the chain (${rpcError.slice(0, 80)}); try another RPC`
        : "the RPC has no finalized, successful transaction with this signature",
  });
  if (rpcError) return { checks, verified: false, pendingSeal: false, rpcUnreachable: true };

  const memo = landed ? anchorMemoOf(tx!, opts.attester) : null;
  const signer = landed ? tx!.transaction.message.accountKeys[0] : "";
  checks.push({
    key: "signer",
    label: "Signed only by the GL1TCH attester",
    ok: !!memo,
    detail: memo ? opts.attester : landed ? `signed by ${short(signer)}, or not a lone memo: this is not a GL1TCH seal` : "—",
  });

  const expected = memoText(entry.root, entry.count, entry.sweepMs);
  const matches = memo === expected;
  checks.push({
    key: "memo",
    label: "The on-chain memo commits to this exact root",
    ok: matches,
    detail: matches ? expected : memo ? `memo says ${short(memo)}` : "—",
  });

  return { checks, verified: checks.every((c) => c.ok), pendingSeal: false };
}

/** Accepts a downloaded proof file (or a pasted entry); null when it isn't one. */
export function parseProofFile(text: string): ProofEntry | null {
  try {
    const j = JSON.parse(text) as Partial<ProofEntry> & { spec?: string };
    const r = j.record;
    if (!r || typeof r.mint !== "string" || typeof r.chain !== "string" || typeof r.verdict !== "string") return null;
    if (typeof r.score !== "number" || typeof r.scannedAt !== "number") return null;
    if (!Array.isArray(j.proof) || typeof j.root !== "string" || typeof j.count !== "number" || typeof j.sweepMs !== "number") return null;
    const proof = j.proof.filter((p): p is ProofStep => !!p && typeof p.sibling === "string" && (p.side === "L" || p.side === "R"));
    if (proof.length !== j.proof.length) return null;
    const a = j.anchor;
    const anchor = a && typeof a.sig === "string" ? { sig: a.sig, slot: Number(a.slot) || 0, blockTime: typeof a.blockTime === "number" ? a.blockTime : null } : null;
    return { record: r, proof, root: j.root, count: j.count, sweepMs: j.sweepMs, anchor };
  } catch {
    return null;
  }
}
