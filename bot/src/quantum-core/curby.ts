import type { DrawPulse } from "./logic.js";

/**
 * CURBy client (bot side) — real NIST/CU-Boulder quantum-randomness beacon.
 * Mirrors src/lib/quantum/curby.ts. Binds to the finalized round's signed
 * `dataHash` (SHA-512). Returns null on any failure so the executor DEFERS
 * (never silently downgrades to a weaker source; spec §7.2, §14.3).
 */

const BASE = (process.env.CURBY_URL || "https://random.colorado.edu").replace(/\/$/, "");
const API = `${BASE}/api/curbyq`;

export interface CurbyPulse extends DrawPulse {
  verified: boolean;
}

const isHex = (s: unknown, len: number): s is string =>
  typeof s === "string" && new RegExp(`^[0-9a-fA-F]{${len}}$`).test(s);

function parseRound(rec: unknown): CurbyPulse | null {
  const r = rec as {
    cid?: { "/"?: string };
    data?: { content?: { index?: number; payload?: Record<string, unknown> }; signature?: unknown };
  };
  const content = r?.data?.content;
  const p = content?.payload as
    | { stage?: string; round?: number; dataHash?: string; timestamp?: string }
    | undefined;
  if (!p || p.stage !== "randomness" || !isHex(p.dataHash, 128)) return null;
  if (typeof content?.index !== "number" || typeof p.round !== "number") return null;
  const ts = Date.parse(p.timestamp ?? "");
  const signaturePresent = typeof r.data?.signature === "string" && (r.data.signature as string).length > 0;
  const verified = signaturePresent && Number.isFinite(ts) && ts > 0 && ts <= Date.now() + 60_000;
  return {
    round: p.round,
    index: content.index,
    valueHex: p.dataHash.toLowerCase(),
    cid: r.cid?.["/"] ?? "",
    timestamp: p.timestamp ?? "",
    verified,
  };
}

async function fetchRound(path: string): Promise<CurbyPulse | null> {
  try {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 12000);
    const res = await fetch(`${API}${path}`, { signal: ac.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    const json = (await res.json()) as unknown;
    const rec = Array.isArray(json) ? json[json.length - 1] : json;
    return parseRound(rec);
  } catch {
    return null;
  }
}

/** Latest finalized quantum pulse (or null if the current round isn't complete). */
export function latestPulse(): Promise<CurbyPulse | null> {
  return fetchRound("/round/latest");
}
