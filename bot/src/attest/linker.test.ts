import { describe, expect, it } from "vitest";
import nacl from "tweetnacl";
import bs58 from "bs58";
import { Keypair, PublicKey, TransactionInstruction, TransactionMessage, type Connection } from "@solana/web3.js";
import { Linker, RejectedSigs, linkOnce, linkerAttester } from "./linker.js";
import { MEMO_PROGRAM_ID, PINNED_ATTESTER, linkReportMessage } from "./guard.js";
import { memoText } from "./merkle.js";
import type { AttestStore } from "./store.js";

const attester = Keypair.generate();
const stranger = Keypair.generate();
const ROOT = "cd".repeat(32);
const MEMO = memoText(ROOT, 3, 1_790_000_000_000);
const NOW_SEC = 1_800_000_000;
const SIG = (i: number) => `${i}`.replace(/0/g, "z").padStart(64, "A"); // unique, base58-safe, 64 chars

/** A report signed by `by` (the attester unless a test says otherwise). */
const report = (root: string, sig: string, by: Keypair = attester) => ({
  root,
  sig,
  proof: bs58.encode(nacl.sign.detached(Buffer.from(linkReportMessage(root, sig), "utf8"), by.secretKey)),
});

const memoMessage = (payer: PublicKey) =>
  new TransactionMessage({
    payerKey: payer,
    recentBlockhash: Keypair.generate().publicKey.toBase58(),
    instructions: [new TransactionInstruction({ programId: new PublicKey(MEMO_PROGRAM_ID), keys: [], data: Buffer.from(MEMO, "utf8") })],
  }).compileToLegacyMessage();

/**
 * History of `n` transactions touching the attester, newest first. `realAt` is the attester's own anchor; the
 * others are a stranger's copies of its memo, or carry no memo at all when `copies` is false. `throwAt` makes
 * getTransaction fail for that index; `missing` makes it return null (not found).
 */
function rpc(n: number, opts: { realAt?: number; throwAt?: number; copies?: boolean; missing?: number[] } = {}) {
  const sigs = Array.from({ length: n }, (_, i) => ({
    signature: SIG(i),
    err: null,
    memo: opts.copies === false && i !== opts.realAt ? null : `[97] ${MEMO}`,
    blockTime: NOW_SEC - i,
    slot: 0,
  }));
  let txCalls = 0;
  const conn = {
    getSignaturesForAddress: async (_a: unknown, o: { limit?: number; before?: string }) => {
      const start = o.before ? sigs.findIndex((s) => s.signature === o.before) + 1 : 0;
      return sigs.slice(start, start + (o.limit ?? 1000));
    },
    getTransaction: async (sig: string) => {
      txCalls++;
      const i = sigs.findIndex((s) => s.signature === sig);
      if (i < 0 || opts.missing?.includes(i)) return null;
      if (i === opts.throwAt) throw new Error("429 Too Many Requests");
      const payer = i === opts.realAt ? attester.publicKey : stranger.publicKey;
      return { slot: 7, blockTime: NOW_SEC - i, meta: { err: null }, transaction: { message: memoMessage(payer) } };
    },
  } as unknown as Connection;
  return { conn, txCalls: () => txCalls };
}

function pendingStore(pending = true) {
  const marked: string[] = [];
  const store = {
    isPending: (root: string) => pending && root === ROOT && marked.length === 0,
    markAnchored: (a: { root: string }) => (marked.push(a.root), true),
  } as unknown as AttestStore;
  return { store, marked };
}

describe("Linker.report — the runner says which transaction it sent", () => {
  it("links a reported anchor directly, however many copies flood the history", async () => {
    const r = rpc(200, { realAt: 150 });
    const { store, marked } = pendingStore();
    const linker = new Linker(r.conn, attester.publicKey, store);
    expect(await linker.report(report(ROOT, SIG(150)))).toBe("queued");
    expect(r.txCalls()).toBe(0); // the signed report is enough to queue: no RPC on the request
    expect(await linker.tick({ now: NOW_SEC * 1000, budget: 0 })).toBe(1); // history fallback off: the report alone links
    expect(marked).toEqual([ROOT]);
    expect(r.txCalls()).toBe(1); // one finalized check
  });

  it("drops a reported transaction that turns out not to be an attester anchor, and never fetches it again", async () => {
    const r = rpc(10, { realAt: 9 });
    const linker = new Linker(r.conn, attester.publicKey, pendingStore().store);
    expect(await linker.report(report(ROOT, SIG(3)))).toBe("queued");
    expect(await linker.tick({ now: NOW_SEC * 1000, budget: 0 })).toBe(0);
    expect(await linker.report(report(ROOT, SIG(3)))).toBe("rejected");
    expect(r.txCalls()).toBe(1);
  });

  it("answers a replayed report from the queue, without an RPC call", async () => {
    const r = rpc(10, { realAt: 4 });
    const linker = new Linker(r.conn, attester.publicKey, pendingStore().store);
    expect(await linker.report(report(ROOT, SIG(4)))).toBe("queued");
    expect(await linker.report(report(ROOT, SIG(4)))).toBe("queued");
    expect(r.txCalls()).toBe(0);
  });

  it("ignores a report for a root that isn't pending, without fetching anything", async () => {
    const r = rpc(10, { realAt: 1 });
    const linker = new Linker(r.conn, attester.publicKey, pendingStore(false).store);
    expect(await linker.report(report(ROOT, SIG(1)))).toBe("not_pending");
    expect(r.txCalls()).toBe(0);
  });

  it("refuses malformed reports", async () => {
    const r = rpc(1);
    const linker = new Linker(r.conn, attester.publicKey, pendingStore().store);
    expect(await linker.report({ ...report(ROOT, SIG(0)), root: "nope" })).toBe("invalid");
    expect(await linker.report({ ...report(ROOT, SIG(0)), sig: "0OIl" })).toBe("invalid");
    expect(await linker.report({ root: ROOT, sig: SIG(0) })).toBe("invalid"); // no proof
    expect(await linker.report(null)).toBe("invalid");
    expect(r.txCalls()).toBe(0);
  });

  it("keeps a reported anchor queued until its RPC can see it finalized, then links it", async () => {
    const missing = [2];
    const r = rpc(5, { realAt: 2, missing });
    const { store, marked } = pendingStore();
    const linker = new Linker(r.conn, attester.publicKey, store);
    expect(await linker.report(report(ROOT, SIG(2)))).toBe("queued");
    expect(await linker.tick({ now: NOW_SEC * 1000, budget: 0 })).toBe(0); // not visible yet
    missing.length = 0; // now the RPC has it
    expect(await linker.tick({ now: NOW_SEC * 1000, budget: 0 })).toBe(1);
    expect(marked).toEqual([ROOT]);
  });
});

describe("Linker.report — only the attester can report", () => {
  it("refuses a report not signed by the attester before spending any RPC call on it", async () => {
    const r = rpc(10, { realAt: 1 });
    const linker = new Linker(r.conn, attester.publicKey, pendingStore().store);
    expect(await linker.report(report(ROOT, SIG(1), stranger))).toBe("unauthorized");
    expect(await linker.report({ ...report(ROOT, SIG(1)), sig: SIG(2) })).toBe("unauthorized"); // proof for another sig
    expect(r.txCalls()).toBe(0);
  });
});

describe("linkOnce — the history fallback", () => {
  it("links an anchor that a flood of other transactions pushed past the newest 100", async () => {
    const { conn } = rpc(150, { realAt: 120, copies: false });
    const { store, marked } = pendingStore();
    expect(await linkOnce(conn, attester.publicKey, store, { now: NOW_SEC * 1000, pageSize: 50 })).toBe(1);
    expect(marked).toEqual([ROOT]);
  });

  it("checks at most 3 copies per root per tick, remembering rejected ones so the next tick goes deeper", async () => {
    const r = rpc(10, { realAt: 7 });
    const { store, marked } = pendingStore();
    const rejected = new RejectedSigs(5000);
    const opts = { now: NOW_SEC * 1000, rejected };
    expect(await linkOnce(r.conn, attester.publicKey, store, opts)).toBe(0);
    expect(r.txCalls()).toBe(3);
    expect(await linkOnce(r.conn, attester.publicKey, store, opts)).toBe(0);
    expect(r.txCalls()).toBe(6);
    expect(await linkOnce(r.conn, attester.publicKey, store, opts)).toBe(1);
    expect(marked).toEqual([ROOT]);
  });

  it("keeps going when one check fails", async () => {
    const { conn } = rpc(10, { realAt: 2, throwAt: 1 });
    const { store, marked } = pendingStore();
    expect(await linkOnce(conn, attester.publicKey, store, { now: NOW_SEC * 1000 })).toBe(1);
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

describe("linkerAttester — which key the bot links anchors from", () => {
  it("uses the pinned attester on mainnet, warning when the env names another", () => {
    expect(linkerAttester("mainnet-beta", PINNED_ATTESTER)).toEqual({ attester: PINNED_ATTESTER });
    expect(linkerAttester("mainnet-beta", "")).toEqual({ attester: PINNED_ATTESTER });
    const other = Keypair.generate().publicKey.toBase58();
    const r = linkerAttester("mainnet-beta", other);
    expect(r.attester).toBe(PINNED_ATTESTER);
    expect(r.warning).toMatch(/pinned/);
  });

  it("uses the env key on devnet, or none", () => {
    const k = Keypair.generate().publicKey.toBase58();
    expect(linkerAttester("devnet", k)).toEqual({ attester: k });
    expect(linkerAttester("devnet", "")).toEqual({ attester: null });
  });
});
