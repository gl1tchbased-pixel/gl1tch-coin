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

export async function getYieldSnapshot(): Promise<YieldSnapshot | null> {
  try {
    const r = await fetch(`${BASE}/yield`, { signal: AbortSignal.timeout(8000), next: { revalidate: 300 } });
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
