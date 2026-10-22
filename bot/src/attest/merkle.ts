import { createHash } from "node:crypto";

/**
 * Verdict anchoring, format v1 (bot side). Each Rug Radar sweep's verdicts become Merkle leaves; the root
 * goes on Solana in one SPL Memo, so anyone can later prove a verdict existed at that time, unedited.
 * The site has an independent implementation (src/lib/attest/merkle.ts) for in-browser verification;
 * both are held identical by the same locked test vectors.
 *
 *   leaf = sha256(0x00 || canonical JSON)       canonical key order: v, chain, mint, verdict, score, scannedAt, engine
 *   node = sha256(0x01 || left || right)        an odd node at the end of a level is carried up unchanged
 *   memo = "gl1tch:radar:v1:<root hex>:<leaf count>:<sweep ms>"
 */

export const ENGINE = "gl1tch-scan-v1";

export interface VerdictRecord {
  chain: string;
  mint: string;
  verdict: string;
  score: number;
  scannedAt: number; // ms epoch
}

export interface ProofStep {
  sibling: string; // hex
  side: "L" | "R"; // which side the sibling sits on
}

const sha256 = (...parts: Buffer[]) => createHash("sha256").update(Buffer.concat(parts)).digest();

export function canonical(r: VerdictRecord): string {
  return JSON.stringify({
    v: 1,
    chain: r.chain,
    mint: r.mint,
    verdict: r.verdict,
    score: Math.round(r.score),
    scannedAt: Math.trunc(r.scannedAt),
    engine: ENGINE,
  });
}

export function leafHash(r: VerdictRecord): Buffer {
  return sha256(Buffer.from([0]), Buffer.from(canonical(r), "utf8"));
}

function nodeHash(left: Buffer, right: Buffer): Buffer {
  return sha256(Buffer.from([1]), left, right);
}

/** All levels, leaves first. Throws on an empty sweep (nothing to anchor). */
function levels(leaves: Buffer[]): Buffer[][] {
  if (!leaves.length) throw new Error("no leaves to anchor");
  const out = [leaves];
  while (out[out.length - 1].length > 1) {
    const cur = out[out.length - 1];
    const next: Buffer[] = [];
    for (let i = 0; i < cur.length; i += 2) next.push(i + 1 < cur.length ? nodeHash(cur[i], cur[i + 1]) : cur[i]);
    out.push(next);
  }
  return out;
}

export function merkleRoot(records: VerdictRecord[]): string {
  const lv = levels(records.map(leafHash));
  return lv[lv.length - 1][0].toString("hex");
}

export function merkleProof(records: VerdictRecord[], index: number): ProofStep[] {
  const lv = levels(records.map(leafHash));
  const proof: ProofStep[] = [];
  let i = index;
  for (let d = 0; d < lv.length - 1; d++) {
    const level = lv[d];
    const sib = i % 2 === 0 ? i + 1 : i - 1;
    if (sib < level.length) proof.push({ sibling: level[sib].toString("hex"), side: i % 2 === 0 ? "R" : "L" });
    i = Math.floor(i / 2);
  }
  return proof;
}

export function verifyProof(record: VerdictRecord, proof: ProofStep[], rootHex: string): boolean {
  let h = leafHash(record);
  for (const step of proof) {
    const s = Buffer.from(step.sibling, "hex");
    h = step.side === "R" ? nodeHash(h, s) : nodeHash(s, h);
  }
  return h.toString("hex") === rootHex.toLowerCase();
}

export function memoText(rootHex: string, count: number, sweepMs: number): string {
  return `gl1tch:radar:v1:${rootHex}:${count}:${Math.trunc(sweepMs)}`;
}

/** Parses a v1 memo; null if it isn't one. */
export function parseMemo(memo: string): { root: string; count: number; sweepMs: number } | null {
  const m = /^gl1tch:radar:v1:([0-9a-f]{64}):(\d+):(\d+)$/.exec(memo.trim());
  return m ? { root: m[1], count: Number(m[2]), sweepMs: Number(m[3]) } : null;
}

/** Finds a v1 memo inside the RPC's memo field, which wraps the text (e.g. a "[97] " length prefix). Only a hint:
 *  anyone can attach this text to a transaction that mentions the attester, so the signer must be checked too. */
export function findMemo(text: string | null | undefined): { root: string; count: number; sweepMs: number } | null {
  const m = /gl1tch:radar:v1:[0-9a-f]{64}:\d+:\d+/.exec(text ?? "");
  return m ? parseMemo(m[0]) : null;
}
