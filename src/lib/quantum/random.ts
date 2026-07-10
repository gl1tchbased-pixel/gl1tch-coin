/**
 * Quantum Randomness — verifiable RNG derivation + INDEPENDENT verification (site side).
 *
 * The derivation here is byte-identical to the bot's bot/src/random/logic.ts (same
 * sha256 scheme over the same bytes), so a result the service returns can be
 * recomputed here — in the user's browser — with zero trust in the bot. And because
 * the seed is a drand round, `verifyRandomResult()` also BLS-verifies that seed
 * against the published quicknet public key. "Don't trust — verify" applied to RNG.
 */
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, utf8ToBytes } from "@noble/hashes/utils.js";
import { verifyDrandRound } from "./drand";

const sha = (s: string): string => bytesToHex(sha256(utf8ToBytes(s)));
export const hashHex = (s: string): string => sha(s);

const TWO32 = 4294967296;
export const MAX_INTS = 1000;
export const MAX_N = 100000;

export type RandomSpec =
  | { kind: "ints"; min: number; max: number; count: number }
  | { kind: "shuffle"; n: number }
  | { kind: "pick"; n: number; k: number };

export interface RandomResult {
  kind: RandomSpec["kind"];
  values: number[];
}

export function canonicalSpec(spec: RandomSpec): string {
  switch (spec.kind) {
    case "ints":
      return `ints:${spec.min}:${spec.max}:${spec.count}`;
    case "shuffle":
      return `shuffle:${spec.n}`;
    case "pick":
      return `pick:${spec.n}:${spec.k}`;
  }
}

export interface Commitment {
  v: 1;
  keyHash: string;
  spec: RandomSpec;
  salt: string;
  source: "drand-quicknet";
  chainHash: string;
  targetRound: number;
  committedAt: number;
}

export function canonicalCommitment(c: Commitment): string {
  return [
    `v=${c.v}`,
    `keyHash=${c.keyHash}`,
    `spec=${canonicalSpec(c.spec)}`,
    `salt=${c.salt}`,
    `source=${c.source}`,
    `chainHash=${c.chainHash}`,
    `targetRound=${c.targetRound}`,
    `committedAt=${c.committedAt}`,
  ].join("|");
}

export function requestIdOf(c: Commitment): string {
  return sha(canonicalCommitment(c));
}

function makeStream(seedHex: string, requestId: string): () => number {
  const seed = seedHex.toLowerCase();
  const rid = requestId.toLowerCase();
  let g = 0;
  let block = -1;
  let digest = "";
  return () => {
    const b = Math.floor(g / 8);
    if (b !== block) {
      block = b;
      digest = sha(`${seed}:${rid}:${b}`);
    }
    const off = (g % 8) * 8;
    g += 1;
    return parseInt(digest.slice(off, off + 8), 16) >>> 0;
  };
}

function uniform(next: () => number, bound: number): number {
  if (bound === TWO32) return next();
  const limit = Math.floor(TWO32 / bound) * bound;
  let w = next();
  while (w >= limit) w = next();
  return w % bound;
}

/** Byte-identical to bot/src/random/logic.ts::deriveResult. */
export function deriveResult(seedHex: string, requestId: string, spec: RandomSpec): RandomResult {
  const next = makeStream(seedHex, requestId);
  if (spec.kind === "ints") {
    const bound = spec.max - spec.min + 1;
    const values: number[] = [];
    for (let i = 0; i < spec.count; i++) values.push(spec.min + uniform(next, bound));
    return { kind: "ints", values };
  }
  if (spec.kind === "shuffle") {
    const order = Array.from({ length: spec.n }, (_, i) => i);
    for (let i = spec.n - 1; i > 0; i--) {
      const j = uniform(next, i + 1);
      const t = order[i];
      order[i] = order[j];
      order[j] = t;
    }
    return { kind: "shuffle", values: order };
  }
  const pool = Array.from({ length: spec.n }, (_, i) => i);
  const out: number[] = [];
  for (let i = 0; i < spec.k; i++) {
    const j = i + uniform(next, spec.n - i);
    const t = pool[i];
    pool[i] = pool[j];
    pool[j] = t;
    out.push(pool[i]);
  }
  return { kind: "pick", values: out };
}

/** The full proof shape returned by the service for a fulfilled request. */
export interface RandomProof {
  round: number;
  randomness: string;
  signature: string;
}

export interface FulfilledRecord {
  id: string;
  status: string;
  spec: RandomSpec;
  salt: string;
  chainHash: string;
  targetRound: number;
  committedAt: number;
  commitmentString: string;
  result?: RandomResult;
  proof?: RandomProof;
}

export interface VerifyReport {
  ok: boolean;
  checks: { label: string; ok: boolean; detail?: string }[];
}

/**
 * Independently verify a fulfilled randomness record — in the browser, trusting nothing
 * the service said:
 *   1. the commitment string hashes to the claimed requestId,
 *   2. the drand seed round BLS-verifies against the quicknet public key,
 *   3. re-deriving from that seed reproduces the exact result.
 */
export function verifyRandomResult(rec: FulfilledRecord): VerifyReport {
  const checks: VerifyReport["checks"] = [];

  // 1. requestId binds every committed input.
  const recomputedId = sha(rec.commitmentString);
  checks.push({
    label: "Commitment → requestId",
    ok: recomputedId === rec.id,
    detail: recomputedId === rec.id ? "requestId is the hash of the frozen commitment" : `mismatch: ${recomputedId}`,
  });

  if (!rec.result || !rec.proof) {
    checks.push({ label: "Result present", ok: false, detail: "not fulfilled yet" });
    return { ok: false, checks };
  }

  // 2. the drand seed is a real, BLS-verified beacon round.
  const seedOk = verifyDrandRound(rec.proof.round, rec.proof.signature, rec.proof.randomness);
  checks.push({
    label: "drand seed (BLS-12-381)",
    ok: seedOk,
    detail: seedOk ? `round ${rec.proof.round} verified against quicknet pubkey` : "BLS verification failed",
  });

  // 3. re-derivation from the verified seed reproduces the result byte-for-byte.
  const redo = deriveResult(rec.proof.randomness, rec.id, rec.spec);
  const same = JSON.stringify(redo.values) === JSON.stringify(rec.result.values);
  checks.push({
    label: "Re-derive output",
    ok: same,
    detail: same ? "recomputed output matches exactly" : "recomputed output differs",
  });

  return { ok: checks.every((c) => c.ok), checks };
}
