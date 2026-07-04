/**
 * Global scan-counter client — talks to the bot's /stats endpoints (backed by the
 * Railway /data volume). Increments are fire-and-forget so they never block a scan.
 */

const BASE = (process.env.SCAN_STATS_URL || "https://gl1tch-bot-production-3f2c.up.railway.app").replace(/\/$/, "");
const TOKEN = process.env.STATS_TOKEN || "";

export type ScanStats = { scanned: number; flagged: number };

/** Fire-and-forget increment. `flagged` bumps the rug counter by 1; or pass n/flaggedN for batches. */
export function bumpStats(opts: { flagged?: boolean; n?: number; flaggedN?: number }): void {
  if (!TOKEN) return;
  void fetch(`${BASE}/stats/scan`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-stats-token": TOKEN },
    body: JSON.stringify(opts),
    signal: AbortSignal.timeout(4000),
  }).catch(() => {});
}

export async function getStats(): Promise<ScanStats | null> {
  try {
    const r = await fetch(`${BASE}/stats`, { signal: AbortSignal.timeout(6000), next: { revalidate: 20 } });
    if (!r.ok) return null;
    const d = (await r.json()) as { scanned?: number; flagged?: number };
    return { scanned: Number(d.scanned) || 0, flagged: Number(d.flagged) || 0 };
  } catch {
    return null;
  }
}
