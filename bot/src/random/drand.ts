import { createHash } from "node:crypto";

/**
 * drand client (bot side) — the League-of-Entropy "quicknet" threshold-BLS beacon
 * (3s period, unchained-g1). Used to SEED verifiable randomness requests: a request
 * commits to a future round, and once that round finalizes its `randomness` seeds
 * the result.
 *
 * The bot does a cheap integrity check here (randomness == sha256(signature)) using
 * node:crypto only — it has no BLS dependency. The FULL BLS verification against the
 * published public key is done independently by the site / any verifier
 * (src/lib/quantum/drand.ts::verifyDrandRound). That is the trust model: we don't ask
 * anyone to trust the bot's randomness — every proof carries the round + signature so
 * it can be BLS-verified on the client. Non-custodial, no key, no funds.
 */

export const DRAND_CHAIN = "52db9ba70e0cc0f6eaf7803dd07447a1f5477735fd3f661792ba94600c84e971";
const BASE = (process.env.DRAND_URL || "https://api.drand.sh").replace(/\/$/, "");

export interface DrandRound {
  round: number;
  randomness: string;
  signature: string;
}

const sha256Hex = (buf: Buffer): string => createHash("sha256").update(buf).digest("hex");
const isHex = (s: unknown): s is string => typeof s === "string" && /^[0-9a-f]+$/i.test(s) && s.length % 2 === 0;

/** Cheap integrity check available without BLS: randomness must equal sha256(signature). */
export function integrityOk(signatureHex: string, randomnessHex: string): boolean {
  if (!isHex(signatureHex) || !isHex(randomnessHex)) return false;
  try {
    return sha256Hex(Buffer.from(signatureHex, "hex")) === randomnessHex.toLowerCase();
  } catch {
    return false;
  }
}

function parse(d: unknown): DrandRound | null {
  const r = d as { round?: unknown; randomness?: unknown; signature?: unknown };
  if (typeof r?.round !== "number" || !isHex(r.randomness) || !isHex(r.signature)) return null;
  return { round: r.round, randomness: (r.randomness as string).toLowerCase(), signature: (r.signature as string).toLowerCase() };
}

async function get(path: string): Promise<DrandRound | null> {
  try {
    const res = await fetch(`${BASE}/${DRAND_CHAIN}/public/${path}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    return parse(await res.json());
  } catch {
    return null;
  }
}

/** Latest finalized round (null on failure). */
export function latestRound(): Promise<DrandRound | null> {
  return get("latest");
}

/** A specific round by number. Returns null if it does not exist yet (not finalized). */
export function roundByNumber(round: number): Promise<DrandRound | null> {
  if (!Number.isInteger(round) || round < 1) return Promise.resolve(null);
  return get(String(round));
}
