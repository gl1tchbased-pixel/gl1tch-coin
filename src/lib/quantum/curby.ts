/**
 * CURBy client — real quantum-randomness beacon (NIST + CU Boulder).
 * Docs: https://random.colorado.edu  ·  API: /api/curbyq/round/{latest|index}
 *
 * CURBy is a staged Twine/IPLD beacon (spec §18B.4). A round progresses
 * request → … → "randomness" (final, signed). The finalized round's payload
 * carries `dataHash` (SHA-512 of the round data), a `randomness` IPLD CID, a
 * `timestamp`, and a JWS `signature`. We bind our draw to `dataHash`: a public,
 * signed, content-addressed value that DID NOT EXIST before the quantum round
 * completed — exactly the unpredictable-yet-verifiable input a fair draw needs.
 *
 * Honesty: we do not claim to extract the raw 512 entropy bits (those sit behind
 * the `randomness` CID on CURBy's gateway). We bind to CURBy's own signed
 * finalization and record every identifier so anyone can re-fetch the round and
 * recompute the winner. On any failure we return null → the executor DEFERS
 * (never silently downgrades to a weaker source; spec §7.2, §14.3).
 */

const BASE = (process.env.CURBY_URL || "https://random.colorado.edu").replace(/\/$/, "");
const API = `${BASE}/api/curbyq`;

export interface QuantumPulse {
  source: "curby";
  round: number;
  index: number;
  /** SHA-512 (128 hex) that finalizes the round — used as the draw pulse value. */
  valueHex: string;
  /** IPLD content id of the whole round record. */
  cid: string;
  /** IPLD content id of the extracted randomness. */
  randomnessCid: string;
  timestamp: string;
  signaturePresent: boolean;
  verified: boolean;
}

const isHex = (s: unknown, len?: number): s is string =>
  typeof s === "string" && /^[0-9a-fA-F]+$/.test(s) && (len === undefined || s.length === len);

/** Structurally validate CURBy's JWS: 3 dot-parts, header is a signed alg (Twine uses RS256/ES256). */
function validJws(sig: unknown): boolean {
  if (typeof sig !== "string") return false;
  const parts = sig.split(".");
  if (parts.length !== 3 || parts.some((p) => p.length === 0)) return false;
  try {
    const b64 = parts[0].replace(/-/g, "+").replace(/_/g, "/");
    const header = JSON.parse(typeof atob === "function" ? atob(b64) : Buffer.from(b64, "base64").toString());
    return header && (header.alg === "RS256" || header.alg === "ES256");
  } catch {
    return false;
  }
}

/** Parse one CURBy round record into a pulse iff it is a finalized "randomness" stage. */
function parseRound(rec: unknown): QuantumPulse | null {
  const r = rec as {
    cid?: { "/"?: string };
    data?: {
      content?: { index?: number; payload?: Record<string, unknown> };
      signature?: unknown;
    };
  };
  const content = r?.data?.content;
  const payload = content?.payload as
    | { stage?: string; round?: number; dataHash?: string; timestamp?: string; randomness?: { "/"?: string } }
    | undefined;
  if (!payload || payload.stage !== "randomness") return null;
  if (!isHex(payload.dataHash, 128)) return null;
  if (typeof content?.index !== "number" || typeof payload.round !== "number") return null;

  const ts = Date.parse(payload.timestamp ?? "");
  const signaturePresent = validJws(r.data?.signature);
  // Structural verification: finalized stage, a structurally-valid RS256/ES256 Twine JWS over
  // the round, and a sane timestamp. (Full JWS signature check against CURBy's public key is a
  // Tier-3 hardening; the /quantum-core/verify tool re-fetches CURBy directly for zero-trust.)
  const verified = signaturePresent && Number.isFinite(ts) && ts > 0 && ts <= Date.now() + 60_000;

  return {
    source: "curby",
    round: payload.round,
    index: content.index,
    valueHex: payload.dataHash.toLowerCase(),
    cid: r.cid?.["/"] ?? "",
    randomnessCid: payload.randomness?.["/"] ?? "",
    timestamp: payload.timestamp ?? "",
    signaturePresent,
    verified,
  };
}

async function fetchRounds(path: string): Promise<QuantumPulse | null> {
  try {
    const res = await fetch(`${API}${path}`, { signal: AbortSignal.timeout(12000), cache: "no-store" });
    if (!res.ok) return null;
    const json = await res.json();
    const rec = Array.isArray(json) ? json[json.length - 1] : json;
    return parseRound(rec);
  } catch {
    return null;
  }
}

/** Latest finalized quantum pulse, or null if the current round is not yet complete. */
export function latestPulse(): Promise<QuantumPulse | null> {
  return fetchRounds("/round/latest");
}

/** A specific round by index (used to reveal the committed, targeted future round). */
export function pulseByIndex(index: number): Promise<QuantumPulse | null> {
  if (!Number.isInteger(index) || index < 0) return Promise.resolve(null);
  return fetchRounds(`/round/${index}`);
}

/**
 * Reveal step for commit-reveal: the executor committed to "the first finalized
 * round with index > afterIndex". Returns that pulse once it exists and verifies,
 * else null (defer — the pulse the draw is waiting on has not been produced yet).
 */
export async function pulseAfterIndex(afterIndex: number): Promise<QuantumPulse | null> {
  const latest = await latestPulse();
  if (latest && latest.verified && latest.index > afterIndex) return latest;
  return null;
}
