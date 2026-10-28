import { describe, expect, it } from "vitest";
import { Keypair, type Connection } from "@solana/web3.js";
import { PER_ROOT_CHECKS, VerifyBudget, countSentSince, coversSince, isSealedOnChain, recentMemoHints, type OnChainAnchor } from "./chain.js";
import { memoText } from "./merkle.js";

/** A fake RPC holding `n` signatures for the attester, newest first, one second apart. */
function fakeHistory(n: number, opts: { anchorsAt?: number[]; failedAt?: number[]; newestSec?: number; pageCap?: number } = {}) {
  const newest = opts.newestSec ?? 1_800_000_000;
  const sigs = Array.from({ length: n }, (_, i) => ({
    signature: `sig${i}`,
    err: opts.failedAt?.includes(i) ? { InstructionError: [0, "x"] } : null,
    memo: opts.anchorsAt?.includes(i) ? `[97] ${memoText(i.toString(16).padStart(64, "0"), 1, 1_790_000_000_000)}` : null,
    blockTime: newest - i,
    slot: 0,
    confirmationStatus: "finalized",
  }));
  let calls = 0;
  const conn = {
    getSignaturesForAddress: async (_a: unknown, o: { limit?: number; before?: string }) => {
      calls++;
      const start = o.before ? sigs.findIndex((s) => s.signature === o.before) + 1 : 0;
      return sigs.slice(start, start + Math.min(o.limit ?? 1000, opts.pageCap ?? Infinity));
    },
  } as unknown as Connection;
  return { conn, newest, calls: () => calls };
}

const attester = Keypair.generate().publicKey;

describe("recentMemoHints — reads the attester's history back to the window start", () => {
  it("pages past a flood of other transactions to find older anchors, and stops at the window start", async () => {
    const h = fakeHistory(2500, { anchorsAt: [10, 1500, 2400] });
    const since = (h.newest - 2000) * 1000; // window: the newest 2,001 signatures
    const r = await recentMemoHints(h.conn, attester, { commitment: "confirmed", sinceMs: since, pageSize: 1000, maxPages: 10 });
    expect(r.hints.map((x) => x.sig)).toEqual(["sig10", "sig1500"]);
    expect(r.complete).toBe(true);
    expect(h.calls()).toBe(3);
  });

  it("is complete when the history ends before the window does", async () => {
    const h = fakeHistory(300, { anchorsAt: [5], failedAt: [5, 6] });
    const r = await recentMemoHints(h.conn, attester, { commitment: "confirmed", sinceMs: 0, pageSize: 1000, maxPages: 10 });
    expect(r.complete).toBe(true);
    expect(r.hints).toEqual([]); // the only anchor-looking memo is on a failed transaction
  });

  it("says incomplete when the window holds more signatures than it may read, and how far back it got", async () => {
    const h = fakeHistory(5000, { anchorsAt: [4999] });
    const r = await recentMemoHints(h.conn, attester, { commitment: "confirmed", sinceMs: 0, pageSize: 1000, maxPages: 2 });
    expect(r.complete).toBe(false);
    expect(r.oldestMs).toBe((h.newest - 1999) * 1000);
    expect(h.calls()).toBe(2);
  });

  it("keeps paging past short pages (a provider may cap the page size) until an empty page", async () => {
    const h = fakeHistory(700, { anchorsAt: [650], pageCap: 300 });
    const r = await recentMemoHints(h.conn, attester, { commitment: "confirmed", sinceMs: 0, pageSize: 1000, maxPages: 10 });
    expect(r.hints.map((x) => x.sig)).toEqual(["sig650"]);
    expect(r.complete).toBe(true);
  });
});

describe("coversSince — did the read reach back far enough?", () => {
  it("is true for a complete read, or one whose oldest signature is at or before the point asked about", () => {
    expect(coversSince({ complete: true, oldestMs: null }, 1_000)).toBe(true);
    expect(coversSince({ complete: false, oldestMs: 900 }, 1_000)).toBe(true);
    expect(coversSince({ complete: false, oldestMs: 1_100 }, 1_000)).toBe(false);
    expect(coversSince({ complete: false, oldestMs: null }, 1_000)).toBe(false);
  });
});

const anchor = (sig: string, root: string): OnChainAnchor => ({ root, count: 1, sweepMs: 1, sig, slot: 1, blockTime: 1 });

describe("VerifyBudget — bounded, cached signature checks", () => {
  it("checks each signature once per run", async () => {
    let calls = 0;
    const b = new VerifyBudget(async (sig) => (calls++, anchor(sig, "r")), 10);
    await b.check("a");
    await b.check("a");
    expect(calls).toBe(1);
  });

  it("answers 'unknown' once the budget is spent, instead of checking more", async () => {
    let calls = 0;
    const b = new VerifyBudget(async () => (calls++, null), 2);
    expect(await b.check("a")).toBeNull();
    expect(await b.check("b")).toBeNull();
    expect(await b.check("c")).toBeUndefined();
    expect(calls).toBe(2);
  });

  it("treats an RPC error as 'unknown', without throwing", async () => {
    const b = new VerifyBudget(async () => {
      throw new Error("429");
    }, 5);
    expect(await b.check("a")).toBeUndefined();
  });
});

const hint = (sig: string, root: string) => ({ sig, root, count: 1, sweepMs: 1, blockTime: 1 });

describe("countSentSince — the rolling-day count, flood-proof", () => {
  it("counts only anchors the attester really signed", async () => {
    const real = new Set(["s1", "s3"]);
    const b = new VerifyBudget(async (sig) => (real.has(sig) ? anchor(sig, "r") : null), 100);
    expect(await countSentSince([hint("s1", "r"), hint("s2", "r"), hint("s3", "r")], b, 60)).toEqual({ count: 2, exact: true });
  });

  it("stops as soon as the cap is reached", async () => {
    let calls = 0;
    const b = new VerifyBudget(async (sig) => (calls++, anchor(sig, "r")), 100);
    const hints = Array.from({ length: 10 }, (_, i) => hint(`s${i}`, "r"));
    expect(await countSentSince(hints, b, 3)).toEqual({ count: 3, exact: true });
    expect(calls).toBe(3);
  });

  it("is inexact when the budget runs out before the count is settled", async () => {
    const b = new VerifyBudget(async () => null, 2);
    const r = await countSentSince([hint("a", "r"), hint("b", "r"), hint("c", "r")], b, 60);
    expect(r.exact).toBe(false);
  });
});

describe("isSealedOnChain — the 'already sealed?' check, flood-proof", () => {
  it("finds the attester's anchor among copies of its memo", async () => {
    const b = new VerifyBudget(async (sig) => (sig === "real" ? anchor(sig, "R") : null), 100);
    expect(await isSealedOnChain("R", [hint("fake1", "R"), hint("real", "R"), hint("other", "X")], b)).toBe(true);
  });

  it("gives up after a few copies of the same root, so a flood of copies can't stall the run", async () => {
    let calls = 0;
    const b = new VerifyBudget(async () => (calls++, null), 100);
    const copies = Array.from({ length: 50 }, (_, i) => hint(`fake${i}`, "R"));
    expect(await isSealedOnChain("R", copies, b)).toBe(false);
    expect(calls).toBe(PER_ROOT_CHECKS);
  });
});
