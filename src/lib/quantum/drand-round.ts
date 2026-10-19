// drand quicknet rounds as published — fetching only, no crypto, so browser code can read a round
// without loading the BLS library. Verification lives in drand.ts (and runs in a worker in the
// browser, see drand-browser.ts).

// League-of-Entropy "quicknet" chain (3s period, unchained-g1).
export const CHAIN = "52db9ba70e0cc0f6eaf7803dd07447a1f5477735fd3f661792ba94600c84e971";
const BASE = (typeof process !== "undefined" && process.env.DRAND_URL) || "https://api.drand.sh";

export interface DrandPulse {
  round: number;
  randomness: string;
  signature: string;
  verified: boolean;
  source: "drand";
}

/** The latest quicknet round as published, NOT yet verified (`verified: false`). */
export async function fetchLatestRound(): Promise<DrandPulse | null> {
  try {
    const r = await fetch(`${BASE}/${CHAIN}/public/latest`, { cache: "no-store", signal: AbortSignal.timeout(8000) });
    if (!r.ok) return null;
    const d = (await r.json()) as { round?: number; randomness?: string; signature?: string };
    if (typeof d.round !== "number" || typeof d.randomness !== "string" || typeof d.signature !== "string") return null;
    return { round: d.round, randomness: d.randomness, signature: d.signature, verified: false, source: "drand" };
  } catch {
    return null;
  }
}
