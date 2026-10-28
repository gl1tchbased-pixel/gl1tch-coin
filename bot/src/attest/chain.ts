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
 *  fall out of it. This pages back to the window start instead, up to `maxPages`; `complete` is false when the
 *  window held more signatures than that (a flood), and callers must then act as if they missed anchors. */
export async function recentMemoHints(
  conn: Connection,
  attester: PublicKey,
  opts: { commitment: Finality; sinceMs: number; pageSize?: number; maxPages?: number }
): Promise<{ hints: MemoHint[]; complete: boolean }> {
  const pageSize = opts.pageSize ?? 1000;
  const maxPages = opts.maxPages ?? 10;
  const hints: MemoHint[] = [];
  let before: string | undefined;
  for (let page = 0; page < maxPages; page++) {
    const sigs = await conn.getSignaturesForAddress(attester, { limit: pageSize, before }, opts.commitment);
    for (const s of sigs) {
      if (s.blockTime != null && s.blockTime * 1000 < opts.sinceMs) return { hints, complete: true };
      const m = s.err ? null : findMemo(s.memo);
      if (m) hints.push({ sig: s.signature, ...m, blockTime: s.blockTime ?? null });
    }
    if (sigs.length < pageSize) return { hints, complete: true };
    before = sigs[sigs.length - 1].signature;
  }
  return { hints, complete: false };
}

/** The anchor in `sig` if the attester really signed it, else null. */
export async function verifyAnchor(
  conn: Connection,
  sig: string,
  attester: PublicKey,
  commitment: Finality
): Promise<OnChainAnchor | null> {
  const tx = await conn.getTransaction(sig, { commitment, maxSupportedTransactionVersion: 0 });
  if (!tx || !tx.meta || tx.meta.err) return null;
  const memo = anchorMemoOf(shapeOf(tx.transaction.message), attester.toBase58());
  const parsed = memo ? parseMemo(memo) : null;
  return parsed ? { ...parsed, sig, slot: tx.slot, blockTime: tx.blockTime ?? null } : null;
}

/** Verifies several hints, four RPC calls at a time. */
export async function verifyHints(
  conn: Connection,
  hints: MemoHint[],
  attester: PublicKey,
  commitment: Finality
): Promise<OnChainAnchor[]> {
  const out: OnChainAnchor[] = [];
  for (let i = 0; i < hints.length; i += 4) {
    const part = await Promise.all(hints.slice(i, i + 4).map((h) => verifyAnchor(conn, h.sig, attester, commitment)));
    for (const a of part) if (a) out.push(a);
  }
  return out;
}
