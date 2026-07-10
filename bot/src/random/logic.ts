import { createHash } from "node:crypto";

/**
 * Quantum Randomness — verifiable RNG derivation (pure, deterministic, no I/O).
 * Byte-identical to the site's src/lib/quantum/random.ts, so any result produced
 * here can be independently recomputed on the site and by anyone from public inputs.
 *
 * Fairness model (commit-reveal, same shape as the Draw):
 *   1. A request commits to a spec + salt + a FUTURE drand round (targetRound),
 *      unknowable at request time, and freezes a requestId over all of it.
 *   2. Once that round finalizes, its BLS-verified `randomness` seeds the output:
 *        output = f(seed = drand.randomness, requestId, spec)
 *   Because the seed cannot be known or chosen at commit time and requestId binds
 *   every input, the requester cannot bias the result and anyone can recompute it.
 *
 * The derivation is unbiased: a rejection-sampled uint32 stream, keyed by
 * sha256(seed || requestId || block). Modulo bias is eliminated (not just made
 * negligible) by rejecting words above the largest multiple of the range.
 */

const sha = (s: string): string => createHash("sha256").update(Buffer.from(s, "utf8")).digest("hex");
/** sha256 of a UTF-8 string, hex — exported for the request-id + commitment hashing. */
export const hashHex = (s: string): string => sha(s);

const TWO32 = 4294967296; // 2^32
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

const isInt = (x: unknown): x is number => typeof x === "number" && Number.isInteger(x);

/** Validate + normalise an untrusted spec. Rejects anything out of documented bounds. */
export function validateSpec(raw: unknown): { ok: true; spec: RandomSpec } | { ok: false; error: string } {
  const b = (raw ?? {}) as Record<string, unknown>;
  if (b.kind === "ints") {
    if (!isInt(b.min) || !isInt(b.max)) return { ok: false, error: "min/max must be integers" };
    if (b.min > b.max) return { ok: false, error: "min must be <= max" };
    if (b.max - b.min + 1 > TWO32) return { ok: false, error: "range too large (max 2^32)" };
    if (!isInt(b.count) || b.count < 1 || b.count > MAX_INTS) return { ok: false, error: `count must be 1..${MAX_INTS}` };
    return { ok: true, spec: { kind: "ints", min: b.min, max: b.max, count: b.count } };
  }
  if (b.kind === "shuffle") {
    if (!isInt(b.n) || b.n < 1 || b.n > MAX_N) return { ok: false, error: `n must be 1..${MAX_N}` };
    return { ok: true, spec: { kind: "shuffle", n: b.n } };
  }
  if (b.kind === "pick") {
    if (!isInt(b.n) || b.n < 1 || b.n > MAX_N) return { ok: false, error: `n must be 1..${MAX_N}` };
    if (!isInt(b.k) || b.k < 1 || b.k > b.n) return { ok: false, error: "k must be 1..n" };
    return { ok: true, spec: { kind: "pick", n: b.n, k: b.k } };
  }
  return { ok: false, error: "kind must be ints | shuffle | pick" };
}

/** Stable canonical string for a spec (fixed key order) so both sides hash identically. */
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

/** The public commitment frozen at request time (before the seeding round exists). */
export interface Commitment {
  v: 1;
  keyHash: string; // sha256(apiKey) — the key itself never appears publicly
  spec: RandomSpec;
  salt: string; // caller domain-separator (may be "")
  source: "drand-quicknet";
  chainHash: string;
  targetRound: number; // the FUTURE drand round that seeds this — unknowable at commit
  committedAt: number;
}

/** Byte-identical canonical encoding of a commitment (fixed field order). */
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

/** The requestId binds every input; the seed is later mixed with it. */
export function requestIdOf(c: Commitment): string {
  return sha(canonicalCommitment(c));
}

/** A rejection-sampled uint32 stream keyed by sha256(seed || requestId || block). */
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
      digest = sha(`${seed}:${rid}:${b}`); // 64 hex chars = 8 x uint32
    }
    const off = (g % 8) * 8;
    g += 1;
    return parseInt(digest.slice(off, off + 8), 16) >>> 0;
  };
}

/** Unbiased integer in [0, bound), bound in [1, 2^32], via rejection sampling. */
function uniform(next: () => number, bound: number): number {
  if (bound === TWO32) return next();
  const limit = Math.floor(TWO32 / bound) * bound;
  let w = next();
  while (w >= limit) w = next();
  return w % bound;
}

/**
 * Deterministically derive the result from a seed (drand randomness), the requestId,
 * and the spec. Identical on bot and site → recomputable by anyone.
 */
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
    // Fisher-Yates from the high end — each step draws a fresh uniform index.
    for (let i = spec.n - 1; i > 0; i--) {
      const j = uniform(next, i + 1);
      const t = order[i];
      order[i] = order[j];
      order[j] = t;
    }
    return { kind: "shuffle", values: order };
  }
  // pick: k distinct indices from [0, n) via a partial Fisher-Yates (unbiased, no bias reuse).
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

/** Human-readable recompute recipe embedded in every proof (self-documenting). */
export const DERIVATION_RECIPE =
  "seed = drand.randomness (BLS-verified against the quicknet public key); " +
  "word(g) = uint32(sha256(seed:requestId:floor(g/8))[g%8]); " +
  "each output = rejection-sampled uniform over its range; " +
  "shuffle/pick = Fisher-Yates over that stream.";
