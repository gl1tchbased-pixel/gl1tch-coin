import { describe, expect, it } from "vitest";
import { Keypair, PublicKey, TransactionInstruction, TransactionMessage, type Connection } from "@solana/web3.js";
import { linkOnce } from "./linker.js";
import { MEMO_PROGRAM_ID } from "./guard.js";
import { memoText } from "./merkle.js";
import type { AttestStore } from "./store.js";

const attester = Keypair.generate();
const ROOT = "cd".repeat(32);
const MEMO = memoText(ROOT, 3, 1_790_000_000_000);
const NOW_SEC = 1_800_000_000;

/** History of 150 transactions touching the attester, newest first; the real anchor is the 121st. */
function floodedRpc(): Connection {
  const sigs = Array.from({ length: 150 }, (_, i) => ({
    signature: `sig${i}`,
    err: null,
    memo: i === 120 ? `[97] ${MEMO}` : null,
    blockTime: NOW_SEC - i,
    slot: 0,
  }));
  const anchorMessage = new TransactionMessage({
    payerKey: attester.publicKey,
    recentBlockhash: Keypair.generate().publicKey.toBase58(),
    instructions: [new TransactionInstruction({ programId: new PublicKey(MEMO_PROGRAM_ID), keys: [], data: Buffer.from(MEMO, "utf8") })],
  }).compileToLegacyMessage();
  return {
    getSignaturesForAddress: async (_a: unknown, o: { limit?: number; before?: string }) => {
      const start = o.before ? sigs.findIndex((s) => s.signature === o.before) + 1 : 0;
      return sigs.slice(start, start + (o.limit ?? 1000));
    },
    getTransaction: async (sig: string) =>
      sig === "sig120" ? { slot: 7, blockTime: NOW_SEC - 120, meta: { err: null }, transaction: { message: anchorMessage } } : null,
  } as unknown as Connection;
}

describe("linkOnce", () => {
  it("links a sealed sweep even after a flood pushed its anchor past the newest 100 transactions", async () => {
    const marked: string[] = [];
    const store = {
      isPending: (root: string) => root === ROOT,
      markAnchored: (a: { root: string }) => (marked.push(a.root), true),
    } as unknown as AttestStore;
    const n = await linkOnce(floodedRpc(), attester.publicKey, store, { now: NOW_SEC * 1000, pageSize: 50 });
    expect(n).toBe(1);
    expect(marked).toEqual([ROOT]);
  });
});
