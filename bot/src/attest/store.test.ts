import { afterEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { AttestStore } from "./store.js";
import { verifyProof, type VerdictRecord } from "./merkle.js";

const t0 = 1792540800000;
const rec = (mint: string, verdict = "LOW RISK", score = 80): VerdictRecord => ({ chain: "solana", mint, verdict, score, scannedAt: t0 + 1000 });
const MINTS = ["3HQJwwHvzy8pGkPqGQcb4thZCH88MUCHVVSNtHn6pump", "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263", "So11111111111111111111111111111111111111112"];
const files: string[] = [];
const tmp = () => {
  const f = path.join(os.tmpdir(), `attest-${process.pid}-${files.length}-${Date.now()}.jsonl`);
  files.push(f);
  return f;
};
afterEach(() => {
  for (const f of files.splice(0)) fs.rmSync(f, { force: true });
});

describe("AttestStore", () => {
  it("stores a sweep once and serves verifiable proofs", () => {
    const s = new AttestStore(tmp());
    const records = MINTS.map((m) => rec(m));
    const a = s.add(records, t0, t0);
    expect(s.add(records, t0, t0).duplicate).toBe(true);
    const [p] = s.proofs("solana", MINTS[1]);
    expect(p.root).toBe(a.root);
    expect(verifyProof(p.record, p.proof, p.root)).toBe(true);
    expect(p.anchor).toBeNull();
  });

  it("offers unsealed sweeps oldest first and links only a matching anchor", () => {
    const s = new AttestStore(tmp());
    const first = s.add([rec(MINTS[0])], t0, t0);
    const second = s.add([rec(MINTS[1])], t0, t0);
    expect(s.pending(10, t0).map((b) => b.root)).toEqual([first.root, second.root]);

    const anchor = { sig: "sig1", slot: 7, blockTime: 1792540900 };
    expect(s.markAnchored({ root: first.root, count: 2, sweepMs: t0, ...anchor })).toBe(false); // wrong count
    expect(s.markAnchored({ root: first.root, count: 1, sweepMs: t0 + 1, ...anchor })).toBe(false); // wrong time
    expect(s.markAnchored({ root: "f".repeat(64), count: 1, sweepMs: t0, ...anchor })).toBe(false); // unknown
    expect(s.markAnchored({ root: first.root, count: 1, sweepMs: t0, ...anchor })).toBe(true);
    expect(s.markAnchored({ root: first.root, count: 1, sweepMs: t0, ...anchor, sig: "sig2" })).toBe(false); // already sealed
    expect(s.pending(10, t0).map((b) => b.root)).toEqual([second.root]);
    expect(s.proofs("solana", MINTS[0])[0].anchor?.sig).toBe("sig1");
  });

  it("stops offering week-old sweeps", () => {
    const s = new AttestStore(tmp());
    s.add([rec(MINTS[0])], t0, t0);
    expect(s.pending(10, t0 + 8 * 86_400_000)).toEqual([]);
  });

  it("reloads from its append-only file and survives a torn last line", () => {
    const f = tmp();
    const s = new AttestStore(f);
    const a = s.add([rec(MINTS[0]), rec(MINTS[1], "RUG-SHAPED", 12)], t0, t0);
    s.markAnchored({ root: a.root, count: 2, sweepMs: t0, sig: "sigX", slot: 1, blockTime: null });
    fs.appendFileSync(f, '{"t":"batch","root":"trunc');
    const again = new AttestStore(f);
    again.load();
    expect(again.summary()).toEqual({ sweeps: 1, sealed: 1, pending: 0 });
    expect(again.proofs("solana", MINTS[1])[0].record.verdict).toBe("RUG-SHAPED");
  });
});
