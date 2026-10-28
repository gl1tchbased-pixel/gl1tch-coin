import type { Connection, Finality, PublicKey, VersionedMessage } from "@solana/web3.js";
import { findMemo, parseMemo } from "./merkle.js";
import { anchorMemoOf, type TxShape } from "./guard.js";

/**
 * Reading anchors back from Solana. The RPC's memo field is only a hint (anyone can attach the same text to a
 * transaction that mentions the attester), so an anchor counts only once its transaction is fetched and shown
 * to be exactly one v1 memo, paid and signed by the attester alone.
 */

export interface MemoHint {
  sig: string;
  root: string;
  count: number;
  sweepMs: number;
  blockTime: number | null;
}

export interface OnChainAnchor {
  root: string;
  count: number;
  sweepMs: number;
  sig: string;
  slot: number;
  blockTime: number | null;
}

export function shapeOf(msg: VersionedMessage): TxShape {
  return {
    accountKeys: msg.staticAccountKeys.map((k) => k.toBase58()),
    numRequiredSignatures: msg.header.numRequiredSignatures,
    hasLookups: msg.addressTableLookups.length > 0,
    instructions: msg.compiledInstructions.map((ix) => ({
      programIndex: ix.programIdIndex,
      accounts: ix.accountKeyIndexes,
      data: ix.data,
    })),
  };
}

/** Successful transactions touching the attester since `sinceMs` whose memo looks like an anchor. Unverified.
 *  Anyone can put the attester in a transaction, so a fixed "last N" window can be flooded until our own anchors
 *  fall out of it. This pages back to the window start instead, up to `maxPages`. It stops only at the window
 *  start or an empty page (a short page may just be a provider's page-size cap). `complete` is false when the
 *  window held more signatures than it may read; `oldestMs` says how far back the read got. */
export async function recentMemoHints(
  conn: Connection,
  attester: PublicKey,
  opts: { commitment: Finality; sinceMs: number; pageSize?: number; maxPages?: number }
): Promise<{ hints: MemoHint[]; complete: boolean; oldestMs: number | null }> {
  const pageSize = opts.pageSize ?? 1000;
  const maxPages = opts.maxPages ?? 10;
  const hints: MemoHint[] = [];
  let oldestMs: number | null = null;
  let before: string | undefined;
  for (let page = 0; page < maxPages; page++) {
    const sigs = await conn.getSignaturesForAddress(attester, { limit: pageSize, before }, opts.commitment);
    if (sigs.length === 0) return { hints, complete: true, oldestMs };
    for (const s of sigs) {
      if (s.blockTime != null) {
        if (s.blockTime * 1000 < opts.sinceMs) return { hints, complete: true, oldestMs };
        oldestMs = s.blockTime * 1000;
      }
      const m = s.err ? null : findMemo(s.memo);
      if (m) hints.push({ sig: s.signature, ...m, blockTime: s.blockTime ?? null });
    }
    before = sigs[sigs.length - 1].signature;
  }
  return { hints, complete: false, oldestMs };
}

/** Whether a history read reached back to `sinceMs` (complete, or its oldest signature is at or before it). */
export function coversSince(r: { complete: boolean; oldestMs: number | null }, sinceMs: number): boolean {
  return r.complete || (r.oldestMs !== null && r.oldestMs <= sinceMs);
}

/**
 * Verifies hints within a per-run budget. Anyone can mint hints (a memo with our text in a transaction that
 * mentions the attester), so checking every one would let a flood of copies stall the run. Each signature is
 * checked at most once; past the budget, or when the RPC fails, the answer is "unknown" (undefined), never a throw.
 */
export class VerifyBudget {
  private readonly cache = new Map<string, OnChainAnchor | null>();
  private used = 0;
  constructor(private readonly verify: (sig: string) => Promise<OnChainAnchor | null>, private readonly max: number) {}

  /** The anchor in `sig`, null if it isn't one the attester signed, undefined if unknown. */
  async check(sig: string): Promise<OnChainAnchor | null | undefined> {
    if (this.cache.has(sig)) return this.cache.get(sig) as OnChainAnchor | null;
    if (this.used >= this.max) return undefined;
    this.used++;
    try {
      const r = await this.verify(sig);
      this.cache.set(sig, r);
      return r;
    } catch {
      return undefined;
    }
  }
}

/** Anchors the attester really sent among `hints`, counted up to `cap`. `exact` is false when some hint couldn't
 *  be checked and the cap wasn't reached, so the true count may be higher. */
export async function countSentSince(hints: MemoHint[], budget: VerifyBudget, cap: number): Promise<{ count: number; exact: boolean }> {
  let count = 0;
  let exact = true;
  for (const h of hints) {
    if (count >= cap) return { count, exact: true };
    const a = await budget.check(h.sig);
    if (a === undefined) exact = false;
    else if (a) count++;
  }
  return { count, exact: count >= cap ? true : exact };
}

/** Copies of one root worth checking for "already sealed?". Past that the sweep is sealed again: a duplicate
 *  anchor costs one fee, while skipping would let anyone block a chosen sweep with copies of its memo. */
export const PER_ROOT_CHECKS = 3;

export async function isSealedOnChain(root: string, hints: MemoHint[], budget: VerifyBudget, perRoot = PER_ROOT_CHECKS): Promise<boolean> {
  let tried = 0;
  for (const h of hints) {
    if (h.root !== root) continue;
    if (tried >= perRoot) break;
    tried++;
    const a = await budget.check(h.sig);
    if (a && a.root === root) return true;
  }
  return false;
}

/** The anchor in `sig` if the attester really signed it; "rejected" if the transaction exists and isn't one (at
 *  finalized commitment that never changes); null if it couldn't be fetched (try again later). */
export async function verifyAnchorOrReject(
  conn: Connection,
  sig: string,
  attester: PublicKey,
  commitment: Finality
): Promise<OnChainAnchor | "rejected" | null> {
  const tx = await conn.getTransaction(sig, { commitment, maxSupportedTransactionVersion: 0 });
  if (!tx || !tx.meta) return null;
  if (tx.meta.err) return "rejected";
  const memo = anchorMemoOf(shapeOf(tx.transaction.message), attester.toBase58());
  const parsed = memo ? parseMemo(memo) : null;
  return parsed ? { ...parsed, sig, slot: tx.slot, blockTime: tx.blockTime ?? null } : "rejected";
}

/** The anchor in `sig` if the attester really signed it, else null. */
export async function verifyAnchor(
  conn: Connection,
  sig: string,
  attester: PublicKey,
  commitment: Finality
): Promise<OnChainAnchor | null> {
  const r = await verifyAnchorOrReject(conn, sig, attester, commitment);
  return r === "rejected" ? null : r;
}

