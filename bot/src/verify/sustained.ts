/**
 * Sustained-balance (anti-gaming) logic for rank tiers — PREMIUM-PLAN-v3, Phase 0.
 *
 * A tier must reflect *held* $GL1TCH, not a balance flashed for one block to unlock a
 * perk and then dumped. We therefore gate on a 7-day time-weighted average balance:
 * a brief spike contributes ~0 to a 7-day mean, so it cannot buy a tier.
 *
 * Pure, side-effect-free, unit-tested. Persistence lives in ./history-store.ts.
 */

export interface BalanceSnapshot {
  ts: number; // epoch ms
  balance: number; // UI amount of $GL1TCH at that time
}

export const SUSTAINED_WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const KEEP_MS = SUSTAINED_WINDOW_MS + 24 * 60 * 60 * 1000; // keep a little extra for a clean average

/** Append a snapshot and drop samples older than the retention window. Returns a new array. */
export function recordSnapshot(
  snaps: BalanceSnapshot[],
  balance: number,
  now: number,
  keepMs: number = KEEP_MS
): BalanceSnapshot[] {
  const cutoff = now - keepMs;
  return [...snaps, { ts: now, balance }]
    .filter((s) => s.ts >= cutoff)
    .sort((a, b) => a.ts - b.ts);
}

export interface Sustained {
  average: number; // time-weighted mean balance over the covered window
  coverageMs: number; // how much of the 7-day window we actually have data for
  confirmed: boolean; // true once we have a full window of history (sustained holding proven)
}

/**
 * Time-weighted average balance over the trailing `windowMs`. Each snapshot's balance is
 * assumed to hold until the next snapshot (a step function); the newest snapshot extends
 * to `now`. Time before the first sample is not counted, and `coverageMs` reports how much
 * of the window is actually backed by data — the tier stays *provisional* until it's full.
 */
export function sustainedBalance(
  snaps: BalanceSnapshot[],
  now: number,
  windowMs: number = SUSTAINED_WINDOW_MS
): Sustained {
  if (snaps.length === 0) return { average: 0, coverageMs: 0, confirmed: false };
  const sorted = [...snaps].sort((a, b) => a.ts - b.ts);
  const windowStart = now - windowMs;
  const start = Math.max(windowStart, sorted[0].ts);

  let area = 0;
  for (let i = 0; i < sorted.length; i++) {
    const s = sorted[i];
    const segStart = Math.max(s.ts, windowStart);
    const segEnd = i + 1 < sorted.length ? sorted[i + 1].ts : now;
    if (segEnd <= segStart) continue; // sample fully before the window
    area += s.balance * (segEnd - segStart);
  }

  const coverageMs = Math.max(0, now - start);
  const average = coverageMs > 0 ? area / coverageMs : sorted[sorted.length - 1].balance;
  return { average, coverageMs, confirmed: coverageMs >= windowMs };
}

/**
 * The balance a tier is granted on. Once we have a full window of history we gate on the
 * lower of current vs. sustained (so a recent dump immediately loses perks and a flash-buy
 * never gains them). Until the window is full the tier is provisional and rides on the
 * current balance — we never wrongly lock out a genuine new holder.
 */
export function effectiveBalance(current: number, sustained: Sustained): number {
  return sustained.confirmed ? Math.min(current, sustained.average) : current;
}
