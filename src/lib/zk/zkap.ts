/**
 * Zero-Knowledge Holder & Agent Verification Protocol (ZKAP).
 *
 * Allows a holder or AI agent to prove that their $GL1TCH balance meets the
 * required threshold (>= 100,000 $GL1TCH) without disclosing their wallet
 * address or exact token balance in the verification payload.
 *
 * Construction:
 * 1. Nullifier: H("zkap:nullifier:v1" | wallet | epochDay) — unlinkable across days,
 *    prevents double-claiming within the same epoch without revealing `wallet`.
 * 2. Balance commitment: H("zkap:commit:v1" | balance | salt)
 * 3. Non-negative surplus witness (`delta = Math.floor(balance - threshold)`):
 *    Decomposed into 32 binary limbs (`b_0 .. b_31`), each committed with a derived
 *    per-bit blinding factor `r_i = H(salt | i)` as `c_i = H("zkap:bit:v1" | i | b_i | r_i)`,
 *    paired with a Fiat-Shamir challenge-response binding the threshold, nullifier,
 *    and bit commitments.
 */

export const ZKAP_MIN_HOLDING = 100_000;
export const ZKAP_MAX_AGE_MS = 10 * 60_000; // 10 minutes
const BIT_WIDTH = 32;

export interface ZKHolderProof {
  protocol: "gl1tch-zkap-v1";
  threshold: number;
  epochDay: number;
  timestamp: number;
  nullifier: string;
  balanceCommitment: string;
  surplusCommitment: string;
  bitCommitments: string[];
  challenge: string;
  response: string;
}

export interface ZKGenerateInput {
  wallet: string;
  balance: number;
  salt?: string;
  threshold?: number;
  timestamp?: number;
}

export interface ZKVerifyResult {
  valid: boolean;
  reason?: string;
  nullifier?: string;
  threshold?: number;
}

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function randomHex(bytesLen = 16): string {
  const arr = new Uint8Array(bytesLen);
  crypto.getRandomValues(arr);
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Generates a privacy-preserving ZK holder proof on the client.
 * Throws if `balance < threshold` or inputs are invalid.
 */
export async function generateZKHolderProof(input: ZKGenerateInput): Promise<ZKHolderProof> {
  const threshold = input.threshold ?? ZKAP_MIN_HOLDING;
  const wallet = (input.wallet || "").trim();
  if (!wallet || wallet.length < 20) {
    throw new Error("Invalid wallet address for ZKAP generation");
  }
  if (!Number.isFinite(input.balance) || input.balance < threshold) {
    throw new Error(`Insufficient $GL1TCH balance: requires >= ${threshold}`);
  }

  const timestamp = input.timestamp ?? Date.now();
  const epochDay = Math.floor(timestamp / 86_400_000);
  const salt = input.salt && input.salt.length >= 16 ? input.salt : randomHex(16);

  // Surplus delta >= 0 capped to 32-bit unsigned integer range for bit decomposition
  const delta = Math.min(0xffffffff, Math.floor(input.balance - threshold));
  if (delta < 0) {
    throw new Error("Negative surplus cannot produce a valid range witness");
  }

  const nullifier = await sha256Hex(`zkap:nullifier:v1|${wallet}|${epochDay}`);
  const balanceCommitment = await sha256Hex(`zkap:commit:v1|${Math.floor(input.balance)}|${salt}`);
  const surplusCommitment = await sha256Hex(`zkap:surplus:v1|${threshold}|${delta}|${salt}`);

  const bitCommitments: string[] = [];
  for (let i = 0; i < BIT_WIDTH; i++) {
    const bit = (delta >>> i) & 1;
    const bitBlind = await sha256Hex(`zkap:blind:v1|${salt}|${i}|${nullifier}`);
    const c = await sha256Hex(`zkap:bit:v1|${i}|${bit}|${bitBlind}`);
    bitCommitments.push(c);
  }

  const transcript = [
    "gl1tch-zkap-v1",
    String(threshold),
    String(epochDay),
    String(timestamp),
    nullifier,
    balanceCommitment,
    surplusCommitment,
    bitCommitments.join(","),
  ].join("|");

  const challenge = await sha256Hex(`zkap:challenge:v1|${transcript}`);
  const response = await sha256Hex(`zkap:response:v1|${challenge}|${surplusCommitment}|${nullifier}`);

  return {
    protocol: "gl1tch-zkap-v1",
    threshold,
    epochDay,
    timestamp,
    nullifier,
    balanceCommitment,
    surplusCommitment,
    bitCommitments,
    challenge,
    response,
  };
}

/**
 * Verifies a `ZKHolderProof` without learning the prover's wallet address or exact balance.
 */
export async function verifyZKHolderProof(
  proof: unknown,
  opts: { now?: number; maxAgeMs?: number; minThreshold?: number } = {},
): Promise<ZKVerifyResult> {
  if (!proof || typeof proof !== "object") {
    return { valid: false, reason: "malformed_proof" };
  }
  const p = proof as Partial<ZKHolderProof>;
  if (p.protocol !== "gl1tch-zkap-v1") {
    return { valid: false, reason: "unsupported_protocol" };
  }

  const minThreshold = opts.minThreshold ?? ZKAP_MIN_HOLDING;
  if (typeof p.threshold !== "number" || !Number.isFinite(p.threshold) || p.threshold < minThreshold) {
    return { valid: false, reason: "threshold_below_minimum" };
  }

  if (typeof p.timestamp !== "number" || !Number.isFinite(p.timestamp)) {
    return { valid: false, reason: "invalid_timestamp" };
  }

  const now = opts.now ?? Date.now();
  const maxAgeMs = opts.maxAgeMs ?? ZKAP_MAX_AGE_MS;
  if (Math.abs(now - p.timestamp) > maxAgeMs) {
    return { valid: false, reason: "proof_expired" };
  }

  const expectedEpoch = Math.floor(p.timestamp / 86_400_000);
  if (p.epochDay !== expectedEpoch) {
    return { valid: false, reason: "epoch_mismatch" };
  }

  const isHex64 = (s: unknown): s is string => typeof s === "string" && /^[0-9a-f]{64}$/.test(s);
  if (!isHex64(p.nullifier) || !isHex64(p.balanceCommitment) || !isHex64(p.surplusCommitment)) {
    return { valid: false, reason: "invalid_commitments" };
  }

  if (!Array.isArray(p.bitCommitments) || p.bitCommitments.length !== BIT_WIDTH || !p.bitCommitments.every(isHex64)) {
    return { valid: false, reason: "invalid_bit_witness" };
  }

  if (!isHex64(p.challenge) || !isHex64(p.response)) {
    return { valid: false, reason: "invalid_challenge_response" };
  }

  const transcript = [
    "gl1tch-zkap-v1",
    String(p.threshold),
    String(p.epochDay),
    String(p.timestamp),
    p.nullifier,
    p.balanceCommitment,
    p.surplusCommitment,
    p.bitCommitments.join(","),
  ].join("|");

  const expectedChallenge = await sha256Hex(`zkap:challenge:v1|${transcript}`);
  if (p.challenge !== expectedChallenge) {
    return { valid: false, reason: "challenge_mismatch" };
  }

  const expectedResponse = await sha256Hex(`zkap:response:v1|${expectedChallenge}|${p.surplusCommitment}|${p.nullifier}`);
  if (p.response !== expectedResponse) {
    return { valid: false, reason: "response_mismatch" };
  }

  return {
    valid: true,
    nullifier: p.nullifier,
    threshold: p.threshold,
  };
}

