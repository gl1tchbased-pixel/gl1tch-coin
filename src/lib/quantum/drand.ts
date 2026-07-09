/**
 * drand client — a SECOND, fully cryptographically-verifiable randomness source
 * (the League of Entropy threshold-BLS beacon). Complements CURBy: where CURBy is
 * quantum but we can only structurally check its Twine JWS, a drand round can be
 * FULLY verified here with BLS12-381 against drand's published public key.
 *
 * Spec compliance: drand is a secondary source for reward-FREE / low-importance
 * use only. The reward Draw stays CURBy-only and defers rather than downgrade
 * (spec §3, §7.2). This exists to (a) show a second, cryptographically-verified
 * source and (b) back future reward-free features.
 *
 * Scheme: bls-unchained-g1-rfc9380 — signature in G1, public key in G2,
 * message = sha256(uint64_be(round)) hashed to G1, randomness = sha256(signature).
 */
import { bls12_381 } from "@noble/curves/bls12-381.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { hexToBytes, bytesToHex } from "@noble/hashes/utils.js";

// League-of-Entropy "quicknet" chain (3s period, unchained-g1) + its published G2 public key.
const CHAIN = "52db9ba70e0cc0f6eaf7803dd07447a1f5477735fd3f661792ba94600c84e971";
export const DRAND_PUBKEY =
  "83cf0f2896adee7eb8b5f01fcad3912212c437e0073e911fb90022d3e760183c8c4b450b6a0a6c3ac6a5776a2d1064510d1fec758c921cc22b0e17e63aaf4bcb5ed66304de9cf809bd274ca73bab4af5a6e9c76a4bc09e76eae8991ef5ece45a";
const DST = "BLS_SIG_BLS12381G1_XMD:SHA-256_SSWU_RO_NUL_";
const BASE = (typeof process !== "undefined" && process.env.DRAND_URL) || "https://api.drand.sh";

export interface DrandPulse {
  round: number;
  randomness: string;
  signature: string;
  verified: boolean;
  source: "drand";
}

/** The 8-byte big-endian encoding of the round number (drand's signed pre-image).
 *  drand rounds are well under 2^53, so plain-number arithmetic is exact here. */
function roundBytes(round: number): Uint8Array {
  const buf = new Uint8Array(8);
  let n = Math.floor(round);
  for (let i = 7; i >= 0; i--) {
    buf[i] = n & 0xff;
    n = Math.floor(n / 256);
  }
  return buf;
}

/**
 * Fully verify a drand round: BLS-check the signature against the beacon public key
 * AND confirm randomness == sha256(signature). Pure — no network. This is a REAL
 * cryptographic verification (unlike CURBy, whose signing key we don't hold).
 */
export function verifyDrandRound(round: number, signatureHex: string, randomnessHex: string, publicKeyHex = DRAND_PUBKEY): boolean {
  try {
    const msg = sha256(roundBytes(round));
    // hashToCurve returns an H2C projective point; shortSignatures.verify accepts it at runtime.
    const Hm = bls12_381.G1.hashToCurve(msg, { DST }) as unknown as Parameters<typeof bls12_381.shortSignatures.verify>[1];
    const sigOk = bls12_381.shortSignatures.verify(hexToBytes(signatureHex), Hm, hexToBytes(publicKeyHex));
    const randOk = bytesToHex(sha256(hexToBytes(signatureHex))) === randomnessHex.toLowerCase();
    return sigOk && randOk;
  } catch {
    return false;
  }
}

/** Fetch the latest drand round and verify it. Null on failure (never downgrades). */
export async function latestDrand(): Promise<DrandPulse | null> {
  try {
    const r = await fetch(`${BASE}/${CHAIN}/public/latest`, { cache: "no-store", signal: AbortSignal.timeout(8000) });
    if (!r.ok) return null;
    const d = (await r.json()) as { round?: number; randomness?: string; signature?: string };
    if (typeof d.round !== "number" || typeof d.randomness !== "string" || typeof d.signature !== "string") return null;
    return {
      round: d.round,
      randomness: d.randomness,
      signature: d.signature,
      verified: verifyDrandRound(d.round, d.signature, d.randomness),
      source: "drand",
    };
  } catch {
    return null;
  }
}
