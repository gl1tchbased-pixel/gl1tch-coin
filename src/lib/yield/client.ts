import type { YieldOpportunity, YieldPoint, YieldSnapshot } from "./types";

/**
 * Yield X-Ray data client — reads the bot's on-chain yield snapshot (collected hourly on the bot). Every
 * failure returns null / [] so pages can show an explicit "temporarily unavailable" state instead of crashing.
 */

const BASE = (process.env.SCAN_STATS_URL || "https://bot.gl1tchbased.xyz").replace(/\/$/, "");
const ID_RE = /^[a-z0-9-]{3,80}$/;

function isSnapshot(x: unknown): x is YieldSnapshot {
  const s = x as Partial<YieldSnapshot> | null;
  return (
    !!s &&
    typeof s.updatedAt === "number" &&
    Array.isArray(s.opportunities) &&
    s.opportunities.every((o) => typeof o?.id === "string" && typeof o?.chain === "string")
  );
}

/** `fresh` skips the data cache — used only when a cached snapshot doesn't know an id yet. */
export async function getYieldSnapshot(opts: { fresh?: boolean } = {}): Promise<YieldSnapshot | null> {
  try {
    const cache = opts.fresh ? ({ cache: "no-store" } as const) : { next: { revalidate: 300 } };
    const r = await fetch(`${BASE}/yield`, { signal: AbortSignal.timeout(8000), ...cache });
    if (!r.ok) return null;
    const j: unknown = await r.json();
    return isSnapshot(j) ? j : null;
  } catch {
    return null;
  }
}

export async function getYieldHistory(id: string): Promise<YieldPoint[]> {
  if (!ID_RE.test(id)) return [];
  try {
    const r = await fetch(`${BASE}/yield/history?id=${id}`, { signal: AbortSignal.timeout(8000), next: { revalidate: 300 } });
    if (!r.ok) return [];
    const j = (await r.json()) as { points?: unknown };
    return Array.isArray(j.points) ? (j.points as YieldPoint[]) : [];
  } catch {
    return [];
  }
}

export function findOpportunity(snapshot: YieldSnapshot | null, id: string): YieldOpportunity | null {
  return snapshot?.opportunities.find((o) => o.id === id) ?? null;
}

/**
 * A cached snapshot can predate a newly added opportunity (the data cache even survives deploys), which would
 * 404 a freshly shared card. On a miss, ask the bot once more without the cache before giving up.
 */
export async function findOpportunityFresh(
  snapshot: YieldSnapshot | null,
  id: string
): Promise<{ snapshot: YieldSnapshot | null; opportunity: YieldOpportunity | null }> {
  const hit = findOpportunity(snapshot, id);
  if (hit || !ID_RE.test(id)) return { snapshot, opportunity: hit };
  const fresh = await getYieldSnapshot({ fresh: true });
  return { snapshot: fresh ?? snapshot, opportunity: findOpportunity(fresh, id) };
}
