/**
 * Pay-per-call verifiable random integers (x402). Each call commits to a drand quicknet round that
 * is still at least one period in the future, so neither the caller nor GL1TCH can know its value
 * when the request is made. Once that round is published (every 3 s) its BLS-verified randomness
 * seeds the same derivation the holder Randomness API uses (src/lib/quantum/random.ts), and the
 * response carries everything needed to recompute and check the numbers.
 */

import { randomBytes } from "node:crypto";
import { CHAIN, fetchRound, type DrandPulse } from "@/lib/quantum/drand-round";
import { verifyDrandRound } from "@/lib/quantum/drand";
import { canonicalCommitment, deriveResult, hashHex, requestIdOf, MAX_INTS, type Commitment } from "@/lib/quantum/random";

/** quicknet chain info (api.drand.sh/<chain>/info). */
export const QUICKNET_GENESIS_S = 1692803367;
export const QUICKNET_PERIOD_S = 3;

/** Stands where a holder key's hash goes in a commitment: this call was paid, not key-gated. */
export const X402_KEY_HASH = hashHex("x402");

const TWO32 = 4294967296;
const INT_RE = /^-?\d{1,10}$/;
const SALT_RE = /^[A-Za-z0-9_.:-]{1,64}$/;

export type IntsSpec = { kind: "ints"; min: number; max: number; count: number };

/** Read ?min&max&count&salt (defaults 1, 100, 1, random salt). */
export function parseRandomQuery(sp: URLSearchParams): { spec: IntsSpec; salt?: string } | { error: string } {
  const num = (name: string, fallback: number) => {
    const v = (sp.get(name) ?? "").trim();
    if (!v) return fallback;
    return INT_RE.test(v) ? Number(v) : NaN;
  };
  const min = num("min", 1);
  const max = num("max", 100);
  const count = num("count", 1);
  if (![min, max, count].every(Number.isSafeInteger)) return { error: "min, max and count must be integers" };
  if (min > max) return { error: "min must not exceed max" };
  if (max - min + 1 > TWO32) return { error: "range too large: max - min + 1 must be at most 2^32" };
  if (count < 1 || count > MAX_INTS) return { error: `count must be 1-${MAX_INTS}` };
  const salt = (sp.get("salt") ?? "").trim();
  if (salt && !SALT_RE.test(salt)) return { error: "salt must be 1-64 characters of A-Z a-z 0-9 _ . : -" };
  return salt ? { spec: { kind: "ints", min, max, count }, salt } : { spec: { kind: "ints", min, max, count } };
}

/** The newest round already published at `nowMs`. */
export function currentRound(nowMs: number): number {
  return Math.floor((nowMs / 1000 - QUICKNET_GENESIS_S) / QUICKNET_PERIOD_S) + 1;
}

/** When `round` is published, in ms. */
export function roundTimeMs(round: number): number {
  return (QUICKNET_GENESIS_S + (round - 1) * QUICKNET_PERIOD_S) * 1000;
}

export interface RandomProof {
  source: "drand-quicknet";
  chainHash: string;
  round: number;
  randomness: string;
  signature: string;
  requestId: string;
  commitment: string;
  verify: string;
}

export interface RandomCallResult {
  kind: "ints";
  values: number[];
  spec: IntsSpec;
  proof: RandomProof;
}

const VERIFY_STEPS =
  "randomness = sha256(signature); signature is a BLS signature by the drand quicknet key over sha256(uint64_be(round)); " +
  "requestId = sha256(commitment); values = derive(randomness, requestId, spec) as documented at https://gl1tchbased.xyz/agents/docs#x402";

interface Deps {
  now: () => number;
  sleep: (ms: number) => Promise<void>;
  fetchRound: (round: number) => Promise<DrandPulse | null>;
  verify: (round: number, signature: string, randomness: string) => boolean;
  salt: () => string;
}

const defaultDeps: Deps = {
  now: Date.now,
  sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
  fetchRound,
  verify: verifyDrandRound,
  salt: () => randomBytes(16).toString("hex"),
};

/** Commit, wait for the target round, verify it and derive. Null if drand can't be read or verified
 *  in time (the caller then answers 503 and nothing is charged). */
export async function randomCall(spec: IntsSpec, salt?: string, deps: Partial<Deps> = {}): Promise<RandomCallResult | null> {
  const d = { ...defaultDeps, ...deps };
  const committedAt = d.now();
  // Two rounds ahead of the newest published one: at least one full period away, so unknowable now.
  const targetRound = currentRound(committedAt) + 2;
  const commitment: Commitment = {
    v: 1,
    keyHash: X402_KEY_HASH,
    spec,
    salt: salt ?? d.salt(),
    source: "drand-quicknet",
    chainHash: CHAIN,
    targetRound,
    committedAt,
  };
  const requestId = requestIdOf(commitment);

  const wait = roundTimeMs(targetRound) - d.now();
  if (wait > 0) await d.sleep(wait + 300);
  let pulse: DrandPulse | null = null;
  for (let attempt = 0; attempt < 8 && !pulse; attempt++) {
    pulse = await d.fetchRound(targetRound);
    if (!pulse) await d.sleep(1000);
  }
  if (!pulse || pulse.round !== targetRound || !d.verify(pulse.round, pulse.signature, pulse.randomness)) return null;

  const { values } = deriveResult(pulse.randomness, requestId, spec);
  return {
    kind: "ints",
    values,
    spec,
    proof: {
      source: "drand-quicknet",
      chainHash: CHAIN,
      round: pulse.round,
      randomness: pulse.randomness,
      signature: pulse.signature,
      requestId,
      commitment: canonicalCommitment(commitment),
      verify: VERIFY_STEPS,
    },
  };
}
