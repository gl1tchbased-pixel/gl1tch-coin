/**
 * Global scan-counter client — talks to the bot's /stats endpoints (backed by the bot's
 * data directory). Increments run after the response so they never block a scan.
 */

import { after } from "next/server";

const BASE = (process.env.SCAN_STATS_URL || "https://bot.gl1tchbased.xyz").replace(/\/$/, "");
const TOKEN = process.env.STATS_TOKEN || "";

/** `scanned` is the all-time total (people + automation); since `splitSince` the bot also
 *  counts `user` scans (web, Telegram, API callers) apart from `auto` ones (Rug Radar sweeps,
 *  Watchtower re-scans, link previews, badge renders, self-checks of $GL1TCH). */
/** Counting rules behind user vs auto. Raise it whenever they change: the bot then restarts the
 *  split from zero. 2 = self-checks of $GL1TCH, link previews and badge renders count as auto. */
const SPLIT_REV = 2;

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
      body: JSON.stringify({ ...opts, rev: SPLIT_REV }),
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
