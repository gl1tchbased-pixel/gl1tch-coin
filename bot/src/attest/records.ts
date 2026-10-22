import type { VerdictRecord } from "./merkle.js";

/**
 * Validation for verdict records on their way to being anchored. Strict on purpose: whatever passes here is
 * sealed on-chain for good, so anything unexpected is rejected, never coerced. Used twice: by the bot when the
 * site posts a sweep, and again by the attester runner, which doesn't trust what the bot hands it.
 */

export const MAX_RECORDS = 100;
const VERDICTS = new Set(["CLEAN", "LOW RISK", "CAUTION", "HIGH RISK", "RUG-SHAPED", "UNKNOWN"]);
const EVM_CHAINS = new Set(["ethereum", "base", "bsc", "arbitrum", "polygon"]);
const SOLANA_MINT = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const EVM_ADDRESS = /^0x[0-9a-fA-F]{40}$/;
/** A sweep's scans finish within its 120 s function limit; allow slack for clock skew. */
const SCAN_WINDOW_MS = 15 * 60_000;
const FUTURE_SKEW_MS = 5 * 60_000;

function cleanRecord(x: unknown, sweepMs: number): VerdictRecord | null {
  if (typeof x !== "object" || x === null) return null;
  const r = x as Record<string, unknown>;
  const { chain, mint, verdict, score, scannedAt } = r;
  if (typeof chain !== "string" || typeof mint !== "string" || typeof verdict !== "string") return null;
  if (chain === "solana" ? !SOLANA_MINT.test(mint) : !(EVM_CHAINS.has(chain) && EVM_ADDRESS.test(mint))) return null;
  if (!VERDICTS.has(verdict)) return null;
  if (typeof score !== "number" || !Number.isFinite(score) || score < 0 || score > 100) return null;
  if (typeof scannedAt !== "number" || !Number.isInteger(scannedAt)) return null;
  if (scannedAt < sweepMs - 60_000 || scannedAt > sweepMs + SCAN_WINDOW_MS) return null;
  // Only the known fields go forward: extra keys can't ride along into the sealed leaf.
  return { chain, mint, verdict, score: Math.round(score), scannedAt };
}

/**
 * Checks a posted sweep `{ sweepMs, records }`. `maxAgeMs` is how old a sweep may be: the bot only takes fresh
 * ones, the runner accepts a backlog.
 */
export function validateBatch(
  raw: unknown,
  opts: { now?: number; maxAgeMs: number }
): { records: VerdictRecord[]; sweepMs: number } | { error: string } {
  const now = opts.now ?? Date.now();
  if (typeof raw !== "object" || raw === null) return { error: "body must be an object" };
  const b = raw as Record<string, unknown>;
  const sweepMs = b.sweepMs;
  if (typeof sweepMs !== "number" || !Number.isInteger(sweepMs)) return { error: "sweepMs must be an integer" };
  if (sweepMs < now - opts.maxAgeMs || sweepMs > now + FUTURE_SKEW_MS) return { error: "sweepMs out of range" };
  if (!Array.isArray(b.records) || !b.records.length) return { error: "records required" };
  if (b.records.length > MAX_RECORDS) return { error: `at most ${MAX_RECORDS} records` };
  const records: VerdictRecord[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < b.records.length; i++) {
    const rec = cleanRecord(b.records[i], sweepMs);
    if (!rec) return { error: `record ${i} is invalid` };
    const key = `${rec.chain}:${rec.mint}`;
    if (seen.has(key)) return { error: `record ${i} repeats a token` };
    seen.add(key);
    records.push(rec);
  }
  return { records, sweepMs };
}
