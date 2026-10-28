import { describe, expect, it } from "vitest";
import { Keypair, type Connection } from "@solana/web3.js";
import { recentMemoHints } from "./chain.js";
import { memoText } from "./merkle.js";

/** A fake RPC holding `n` signatures for the attester, newest first, one second apart. */
function fakeHistory(n: number, opts: { anchorsAt?: number[]; failedAt?: number[]; newestSec?: number } = {}) {
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
      return sigs.slice(start, start + (o.limit ?? 1000));
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

  it("says incomplete when the window holds more signatures than it may read", async () => {
    const h = fakeHistory(5000, { anchorsAt: [4999] });
    const r = await recentMemoHints(h.conn, attester, { commitment: "confirmed", sinceMs: 0, pageSize: 1000, maxPages: 2 });
    expect(r.complete).toBe(false);
    expect(h.calls()).toBe(2);
  });
});
