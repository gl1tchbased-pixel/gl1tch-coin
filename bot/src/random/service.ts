import { randomStore, type RandomRecord } from "./store.js";
import { validateSpec, requestIdOf, deriveResult, canonicalCommitment, DERIVATION_RECIPE, type Commitment } from "./logic.js";
import { latestRound, roundByNumber, integrityOk, DRAND_CHAIN } from "./drand.js";
import { createHash } from "node:crypto";

/**
 * Quantum-Randomness service — holder-gated verifiable RNG-as-a-service.
 *
 * request(): commit to a spec + a FUTURE drand round (unknowable now), freeze a
 *   requestId, and log the commitment. Nothing about the result is knowable yet.
 * fulfill(): once the target round has finalized, fetch it, integrity-check it,
 *   derive the result deterministically, and log the reveal. The proof carries the
 *   round + signature so anyone can BLS-verify it and recompute the output.
 *
 * Non-custodial: the API key gates rate/access only; there are no funds, no prizes,
 * no signatures over anything but the caller's own wallet ownership (upstream).
 */

const DRAND_PERIOD_MS = 3000;
const LEAD_ROUNDS = Math.max(4, Number(process.env.RANDOM_LEAD_ROUNDS) || 20); // ~60s ahead, unknowable at commit
const MAX_SALT = 256;

const sha = (s: string): string => createHash("sha256").update(Buffer.from(s, "utf8")).digest("hex");

export interface RequestArgs {
  apiKey: string;
  tier: number;
  tierId: string;
  spec: unknown;
  salt?: unknown;
}

export interface PublicRecord {
  ok: boolean;
  id: string;
  status: RandomRecord["status"];
  spec: Commitment["spec"];
  salt: string;
  source: Commitment["source"];
  chainHash: string;
  targetRound: number;
  committedAt: number;
  availableAt: number;
  availableInMs: number;
  commitmentString: string;
  recipe: string;
  result?: RandomRecord["result"];
  proof?: {
    round: number;
    randomness: string;
    signature: string;
    publicKeyHint: string;
    verifyUrl: string;
  };
  fulfilledAt?: number;
  error?: string;
}

const DRAND_URL = (process.env.DRAND_URL || "https://api.drand.sh").replace(/\/$/, "");

/** Public, safe projection of a record (never leaks the raw key — only its hash in the commitment). */
export function publicView(rec: RandomRecord, now = Date.now()): PublicRecord {
  const c = rec.commitment;
  const out: PublicRecord = {
    ok: true,
    id: rec.id,
    status: rec.status,
    spec: c.spec,
    salt: c.salt,
    source: c.source,
    chainHash: c.chainHash,
    targetRound: c.targetRound,
    committedAt: c.committedAt,
    availableAt: rec.availableAt,
    availableInMs: Math.max(0, rec.availableAt - now),
    commitmentString: canonicalCommitment(c),
    recipe: DERIVATION_RECIPE,
  };
  if (rec.status === "fulfilled" && rec.result && rec.seedRandomness && rec.seedSignature) {
    out.result = rec.result;
    out.fulfilledAt = rec.fulfilledAt;
    out.proof = {
      round: c.targetRound,
      randomness: rec.seedRandomness,
      signature: rec.seedSignature,
      publicKeyHint: "drand quicknet G2 pubkey (bls-unchained-g1-rfc9380)",
      verifyUrl: `${DRAND_URL}/${DRAND_CHAIN}/public/${c.targetRound}`,
    };
  }
  if (rec.status === "void") out.error = rec.error;
  return out;
}

/** Create a new randomness request. Returns the public record (pending). */
export async function requestRandom(args: RequestArgs): Promise<{ status: number; body: Record<string, unknown> }> {
  const v = validateSpec(args.spec);
  if (!v.ok) return { status: 400, body: { ok: false, error: v.error } };

  const salt = typeof args.salt === "string" ? args.salt.slice(0, MAX_SALT) : "";

  const latest = await latestRound();
  if (!latest) return { status: 503, body: { ok: false, error: "drand_unreachable" } };

  const targetRound = latest.round + LEAD_ROUNDS;
  const committedAt = Date.now();
  const commitment: Commitment = {
    v: 1,
    keyHash: sha(args.apiKey),
    spec: v.spec,
    salt,
    source: "drand-quicknet",
    chainHash: DRAND_CHAIN,
    targetRound,
    committedAt,
  };
  const id = requestIdOf(commitment);
  // Idempotent: an identical commitment in the same ms would collide — vanishingly unlikely,
  // but if the id already exists just return it.
  const existing = randomStore.get(id);
  if (existing) return { status: 200, body: publicView(existing) as unknown as Record<string, unknown> };

  const availableAt = committedAt + LEAD_ROUNDS * DRAND_PERIOD_MS;
  const rec: RandomRecord = {
    id,
    status: "pending",
    tier: args.tier,
    tierId: args.tierId,
    commitment,
    availableAt,
  };
  randomStore.create(rec);
  return { status: 200, body: publicView(rec) as unknown as Record<string, unknown> };
}

/**
 * Read a request; if it is pending and its target round has finalized, reveal it now
 * (on-demand — no background executor needed). Returns the public record.
 */
export async function getRandom(id: string): Promise<{ status: number; body: Record<string, unknown> }> {
  if (!id || !/^[0-9a-f]{64}$/.test(id)) return { status: 400, body: { ok: false, error: "bad_id" } };
  const rec = randomStore.get(id);
  if (!rec) return { status: 404, body: { ok: false, error: "not_found" } };

  if (rec.status === "pending") {
    const round = await roundByNumber(rec.commitment.targetRound);
    if (round) {
      // The seeding round exists. Integrity-check (full BLS is done client-side) and derive.
      if (!integrityOk(round.signature, round.randomness)) {
        // A source that fails even the cheap check is not trustworthy — do NOT void
        // (the real round may still finalize elsewhere); just report not-ready.
        return { status: 200, body: { ...publicView(rec), note: "seed_integrity_pending" } };
      }
      const result = deriveResult(round.randomness, rec.id, rec.commitment.spec);
      randomStore.fulfill(rec.id, {
        result,
        seedRandomness: round.randomness,
        seedSignature: round.signature,
        fulfilledAt: Date.now(),
      });
    }
  }
  const fresh = randomStore.get(id)!;
  return { status: 200, body: publicView(fresh) as unknown as Record<string, unknown> };
}
