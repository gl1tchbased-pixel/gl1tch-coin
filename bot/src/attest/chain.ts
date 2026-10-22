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

/** Recent successful transactions touching the attester whose memo looks like an anchor. Unverified. */
export async function recentMemoHints(
  conn: Connection,
  attester: PublicKey,
  opts: { commitment: Finality; limit: number }
): Promise<MemoHint[]> {
  const sigs = await conn.getSignaturesForAddress(attester, { limit: opts.limit }, opts.commitment);
  const out: MemoHint[] = [];
  for (const s of sigs) {
    const m = s.err ? null : findMemo(s.memo);
    if (m) out.push({ sig: s.signature, ...m, blockTime: s.blockTime ?? null });
  }
  return out;
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
