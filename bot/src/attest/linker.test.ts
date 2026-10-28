import { describe, expect, it } from "vitest";
import { Keypair, PublicKey, TransactionInstruction, TransactionMessage, type Connection } from "@solana/web3.js";
import { RejectedSigs, linkOnce } from "./linker.js";
import { MEMO_PROGRAM_ID } from "./guard.js";
import { memoText } from "./merkle.js";
import type { AttestStore } from "./store.js";

const attester = Keypair.generate();
const stranger = Keypair.generate();
const ROOT = "cd".repeat(32);
const MEMO = memoText(ROOT, 3, 1_790_000_000_000);
const NOW_SEC = 1_800_000_000;

const memoMessage = (payer: PublicKey) =>
  new TransactionMessage({
    payerKey: payer,
    recentBlockhash: Keypair.generate().publicKey.toBase58(),
    instructions: [new TransactionInstruction({ programId: new PublicKey(MEMO_PROGRAM_ID), keys: [], data: Buffer.from(MEMO, "utf8") })],
  }).compileToLegacyMessage();

/**
 * History of `n` transactions touching the attester, newest first, each carrying our memo text. `realAt` is the
 * attester's own anchor; every other one is a stranger's copy. `throwAt` makes getTransaction fail for that index.
 */
function rpc(n: number, opts: { realAt?: number; throwAt?: number } = {}) {
  const sigs = Array.from({ length: n }, (_, i) => ({ signature: `sig${i}`, err: null, memo: `[97] ${MEMO}`, blockTime: NOW_SEC - i, slot: 0 }));
  let txCalls = 0;
  const conn = {
    getSignaturesForAddress: async (_a: unknown, o: { limit?: number; before?: string }) => {
      const start = o.before ? sigs.findIndex((s) => s.signature === o.before) + 1 : 0;
      return sigs.slice(start, start + (o.limit ?? 1000));
    },
    getTransaction: async (sig: string) => {
      txCalls++;
      const i = Number(sig.slice(3));
      if (i === opts.throwAt) throw new Error("429 Too Many Requests");
      const payer = i === opts.realAt ? attester.publicKey : stranger.publicKey;
      return { slot: 7, blockTime: NOW_SEC - i, meta: { err: null }, transaction: { message: memoMessage(payer) } };
    },
  } as unknown as Connection;
  return { conn, txCalls: () => txCalls };
}

function pendingStore() {
  const marked: string[] = [];
  const store = {
    isPending: (root: string) => root === ROOT && marked.length === 0,
    markAnchored: (a: { root: string }) => (marked.push(a.root), true),
  } as unknown as AttestStore;
  return { store, marked };
}

describe("linkOnce", () => {
  it("links a sealed sweep even after a flood pushed its anchor past the newest 100 transactions", async () => {
    const { conn } = rpc(150, { realAt: 120 });
    const { store, marked } = pendingStore();
    const n = await linkOnce(conn, attester.publicKey, store, { now: NOW_SEC * 1000, pageSize: 50, budget: 200 });
    expect(n).toBe(1);
    expect(marked).toEqual([ROOT]);
  });

  it("caps verification work per tick, and remembers rejected copies so the next tick goes deeper", async () => {
    const r = rpc(100, { realAt: 60 });
    const { store, marked } = pendingStore();
    const rejected = new RejectedSigs(5000);
    const opts = { now: NOW_SEC * 1000, budget: 40, rejected };
    expect(await linkOnce(r.conn, attester.publicKey, store, opts)).toBe(0);
    expect(r.txCalls()).toBe(40);
    expect(await linkOnce(r.conn, attester.publicKey, store, opts)).toBe(1); // copies 0–39 skipped, real one at 60
    expect(r.txCalls()).toBe(40 + 21);
    expect(marked).toEqual([ROOT]);
  });

  it("keeps going when one check fails", async () => {
    const { conn } = rpc(10, { realAt: 5, throwAt: 2 });
    const { store, marked } = pendingStore();
    expect(await linkOnce(conn, attester.publicKey, store, { now: NOW_SEC * 1000, budget: 40 })).toBe(1);
    expect(marked).toEqual([ROOT]);
  });
});

describe("RejectedSigs", () => {
  it("forgets the oldest entries past its size, so memory stays bounded", () => {
    const s = new RejectedSigs(2);
    s.add("a");
    s.add("b");
    s.add("c");
    expect([s.has("a"), s.has("b"), s.has("c")]).toEqual([false, true, true]);
  });
});
