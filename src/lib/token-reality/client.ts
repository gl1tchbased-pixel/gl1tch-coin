import type { RealityView } from "./types";

/** Reads the bot's New Token Reality view. Any failure → null, so pages show "unavailable", never invented numbers. */

const BASE = (process.env.SCAN_STATS_URL || "https://bot.gl1tchbased.xyz").replace(/\/$/, "");

export function isRealityView(x: unknown): x is RealityView {
  const v = x as Partial<RealityView> | null;
  return (
    !!v &&
    v.version === 1 &&
    typeof v.updatedAt === "number" &&
    typeof v.minSample === "number" &&
    Array.isArray(v.chains) &&
    v.chains.every((c) => typeof c?.chain === "string" && !!c.week && !!c.all && Array.isArray(c.weekly) && Array.isArray(c.byDex) && typeof c.sampled === "number")
  );
}

export async function getReality(): Promise<RealityView | null> {
  try {
    const r = await fetch(`${BASE}/token-reality`, { signal: AbortSignal.timeout(8000), next: { revalidate: 600 } });
    if (!r.ok) return null;
    const j: unknown = await r.json();
    return isRealityView(j) ? j : null;
  } catch {
    return null;
  }
}
