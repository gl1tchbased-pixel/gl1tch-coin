import { describe, expect, it, vi } from "vitest";
import { Keypair, VersionedTransaction, type Connection } from "@solana/web3.js";
import { anchorBatch, type AuditEntry } from "./sender.js";
import { CircuitBreaker, DEFAULT_POLICY } from "./guard.js";
import { merkleRoot, type VerdictRecord } from "./merkle.js";

const t0 = 1792540800000;
const records: VerdictRecord[] = [
  { chain: "solana", mint: "3HQJwwHvzy8pGkPqGQcb4thZCH88MUCHVVSNtHn6pump", verdict: "HIGH RISK", score: 30, scannedAt: t0 + 1000 },
  { chain: "solana", mint: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263", verdict: "LOW RISK", score: 85, scannedAt: t0 + 2000 },
];
const batch = { root: merkleRoot(records), count: 2, sweepMs: t0, records };
const signer = Keypair.generate();

/** A fake RPC: `postLamports` is what the simulation says the attester holds afterwards. */
function fakeConn(opts: { fee?: number | null; postLamports?: number; simErr?: unknown } = {}) {
  const simulated: Uint8Array[] = [];
  const sent: Uint8Array[] = [];
  const conn = {
    getLatestBlockhash: vi.fn(async () => ({ blockhash: Keypair.generate().publicKey.toBase58(), lastValidBlockHeight: 100 })),
    getFeeForMessage: vi.fn(async () => ({ context: { slot: 1 }, value: opts.fee === undefined ? 5000 : opts.fee })),
    getBalance: vi.fn(async () => 1_000_000),
    simulateTransaction: vi.fn(async (tx: VersionedTransaction) => {
      simulated.push(tx.serialize());
      return { context: { slot: 1 }, value: { err: opts.simErr ?? null, logs: [], accounts: [{ lamports: opts.postLamports ?? 995_000 }] } };
    }),
    sendRawTransaction: vi.fn(async (bytes: Uint8Array) => {
      sent.push(bytes);
      return "SIG";
    }),
    confirmTransaction: vi.fn(async () => ({ context: { slot: 2 }, value: { err: null } })),
  };
  return { conn: conn as unknown as Connection, raw: conn, simulated, sent };
}

const run = (conn: Connection, b = batch, breaker = new CircuitBreaker(3)) => {
  const log: AuditEntry[] = [];
  return anchorBatch(conn, signer, b, DEFAULT_POLICY, breaker, (e) => log.push(e)).then((r) => ({ r, log, breaker }));
};

describe("anchorBatch", () => {
  it("sends exactly the bytes it simulated, signed by the attester, and logs each step", async () => {
    const f = fakeConn();
    const { r, log } = await run(f.conn);
    expect(r).toEqual({ ok: true, sig: "SIG" });
    expect(f.sent).toHaveLength(1);
    expect(Buffer.from(f.sent[0]).equals(Buffer.from(f.simulated[0]))).toBe(true);
    const tx = VersionedTransaction.deserialize(f.sent[0]);
    expect(tx.message.staticAccountKeys[0].equals(signer.publicKey)).toBe(true);
    expect(Buffer.from(tx.message.compiledInstructions[0].data).toString()).toBe(`gl1tch:radar:v1:${batch.root}:2:${t0}`);
    expect(log.map((e) => e.step)).toEqual(["sent", "confirmed"]);
    expect(JSON.stringify(log)).not.toContain(Buffer.from(signer.secretKey).toString("hex"));
  });

  it("refuses when the simulated balance drop exceeds the fee cap", async () => {
    const f = fakeConn({ postLamports: 0 });
    const { r } = await run(f.conn);
    expect(r.ok).toBe(false);
    expect(f.raw.sendRawTransaction).not.toHaveBeenCalled();
  });

  it("refuses a failed simulation and a fee over the cap", async () => {
    for (const opts of [{ simErr: "InsufficientFundsForFee" }, { fee: 1_000_000 }, { fee: null }]) {
      const f = fakeConn(opts);
      const { r } = await run(f.conn);
      expect(r.ok).toBe(false);
      expect(f.raw.sendRawTransaction).not.toHaveBeenCalled();
    }
  });

  it("refuses a batch whose root doesn't match its records", async () => {
    const f = fakeConn();
    const { r, log } = await run(f.conn, { ...batch, root: "00".repeat(32) });
    expect(r.ok).toBe(false);
    expect(log[0]).toMatchObject({ step: "root", ok: false });
    expect(f.raw.getLatestBlockhash).not.toHaveBeenCalled();
  });

  it("stops touching the network once the breaker opens", async () => {
    const breaker = new CircuitBreaker(2);
    const bad = { ...batch, count: 3 };
    await run(fakeConn().conn, bad, breaker);
    await run(fakeConn().conn, bad, breaker);
    const f = fakeConn();
    const { r } = await run(f.conn, batch, breaker);
    expect(r).toEqual({ ok: false, reason: "circuit breaker is open" });
    expect(f.raw.getLatestBlockhash).not.toHaveBeenCalled();
  });
});
