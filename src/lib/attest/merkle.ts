import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, hexToBytes, utf8ToBytes } from "@noble/hashes/utils.js";

/**
 * Verdict anchoring, format v1 (site side). Runs in the browser so anyone can check that a GL1TCH verdict
 * was anchored on Solana at a given time and hasn't been edited since, without trusting GL1TCH.
 * Independent of the bot's implementation (bot/src/attest/merkle.ts); both are held identical by the same
 * locked test vectors (vectors.ts).
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
  side: "L" | "R";
}

const concat = (...parts: Uint8Array[]) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
};

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

export function leafHash(r: VerdictRecord): Uint8Array {
  return sha256(concat(new Uint8Array([0]), utf8ToBytes(canonical(r))));
}

function nodeHash(left: Uint8Array, right: Uint8Array): Uint8Array {
  return sha256(concat(new Uint8Array([1]), left, right));
}

/** Recomputes the root from one record and its proof; true if it matches the anchored root. */
export function verifyProof(record: VerdictRecord, proof: ProofStep[], rootHex: string): boolean {
  let h = leafHash(record);
  for (const step of proof) {
    const s = hexToBytes(step.sibling);
    h = step.side === "R" ? nodeHash(h, s) : nodeHash(s, h);
  }
  return bytesToHex(h) === rootHex.toLowerCase();
}

/** Root of a whole sweep (used to cross-check a published sweep against its memo). */
export function merkleRoot(records: VerdictRecord[]): string {
  if (!records.length) throw new Error("no leaves to anchor");
  let level = records.map(leafHash);
  while (level.length > 1) {
    const next: Uint8Array[] = [];
    for (let i = 0; i < level.length; i += 2) next.push(i + 1 < level.length ? nodeHash(level[i], level[i + 1]) : level[i]);
    level = next;
  }
  return bytesToHex(level[0]);
}

export function memoText(rootHex: string, count: number, sweepMs: number): string {
  return `gl1tch:radar:v1:${rootHex}:${count}:${Math.trunc(sweepMs)}`;
}

/** Parses a v1 memo; null if it isn't one. */
export function parseMemo(memo: string): { root: string; count: number; sweepMs: number } | null {
  const m = /^gl1tch:radar:v1:([0-9a-f]{64}):(\d+):(\d+)$/.exec(memo.trim());
  return m ? { root: m[1], count: Number(m[2]), sweepMs: Number(m[3]) } : null;
}
