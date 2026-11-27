import type { TruthView } from "./types";

/**
 * Reads the bot's RPC Truth measurement (a pass every 6 h). Any failure returns null so the page shows an explicit
 * "temporarily unavailable" state instead of crashing or, worse, an empty table that looks like "all fine".
 */

const BASE = (process.env.SCAN_STATS_URL || "https://bot.gl1tchbased.xyz").replace(/\/$/, "");

export function isTruthView(x: unknown): x is TruthView {
  const v = x as Partial<TruthView> | null;
  return (
    !!v &&
    v.version === 1 &&
    typeof v.finishedAt === "number" &&
    typeof v.nextRunAt === "number" &&
    !!v.records &&
    typeof v.records === "object" &&
    Array.isArray(v.chains) &&
    v.chains.every(
      (c) =>
        typeof c?.chain === "string" &&
        Array.isArray(c.probes) &&
        Array.isArray(c.endpoints) &&
        c.endpoints.every((e) => typeof e?.id === "string" && typeof e.url === "string" && typeof e.grade === "string" && !!e.probes)
    )
  );
}

export async function getTruth(): Promise<TruthView | null> {
  try {
    const r = await fetch(`${BASE}/rpc-truth`, { signal: AbortSignal.timeout(8000), next: { revalidate: 300 } });
    if (!r.ok) return null;
    const j: unknown = await r.json();
    return isTruthView(j) ? j : null;
  } catch {
    return null;
  }
}
