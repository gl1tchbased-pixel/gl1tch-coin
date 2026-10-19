/**
 * Global scan-counter client — talks to the bot's /stats endpoints (backed by the
 * Railway /data volume). Increments run after the response so they never block a scan.
 */

import { after } from "next/server";

const BASE = (process.env.SCAN_STATS_URL || "https://gl1tch-bot-production.up.railway.app").replace(/\/$/, "");
const TOKEN = process.env.STATS_TOKEN || "";

/** `scanned` is the all-time total (people + automation); since `splitSince` the bot also
 *  counts `user` scans (web, Telegram, API callers) apart from `auto` ones (Rug Radar sweeps,
 *  Watchtower re-scans). */
export type ScanStats = { scanned: number; flagged: number; user: number; auto: number; splitSince: number | null };

/** Non-blocking increment. `flagged` bumps the rug counter by 1; or pass n/flaggedN for batches.
 *  `kind` says who triggered it. Runs via after() — a bare un-awaited fetch can be cut off once
 *  the function returns. */
export function bumpStats(opts: { flagged?: boolean; n?: number; flaggedN?: number; kind: "user" | "auto" }): void {
  if (!TOKEN) return;
  after(() =>
    fetch(`${BASE}/stats/scan`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-stats-token": TOKEN },
      body: JSON.stringify(opts),
      signal: AbortSignal.timeout(4000),
    }).then(
      () => {},
      () => {}
    )
  );
}

export async function getStats(): Promise<ScanStats | null> {
  try {
    const r = await fetch(`${BASE}/stats`, { signal: AbortSignal.timeout(6000), next: { revalidate: 20 } });
    if (!r.ok) return null;
    const d = (await r.json()) as Partial<Record<keyof ScanStats, number | null>>;
    return {
      scanned: Number(d.scanned) || 0,
      flagged: Number(d.flagged) || 0,
      user: Number(d.user) || 0,
      auto: Number(d.auto) || 0,
      splitSince: Number(d.splitSince) || null,
    };
  } catch {
    return null;
  }
}
