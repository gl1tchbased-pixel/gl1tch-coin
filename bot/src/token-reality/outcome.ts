/**
 * New Token Reality — what happened to a token in its first 72 hours, measured from its own price candles.
 * Pure functions: the store, the sampler and the tests all share them.
 *
 * Reference point is one hour after the pool opened (the moment a typical buyer first hears of a token), so
 * the numbers answer: "if you bought one hour in, how often were you down by half three days later?"
 */

export const HOUR = 3_600_000;
export const WINDOW_MS = 72 * HOUR;

/** [t_ms, open, high, low, close], ascending. */
export type Candle = [number, number, number, number, number];

export type Outcome =
  /** Not a single trade after the first hour (died, rugged or never had a market). */
  | { kind: "stopped_first_hour"; tradedFirstHour: boolean }
  | { kind: "traded"; p1h: number; p72: number; change72: number; maxDrawdown: number; candlesAfter: number }
  /** GeckoTerminal had no candles at all for the pool (unindexed / never traded on record). */
  | { kind: "no_data" };

export function outcomeOf(candles: Candle[], createdAt: number): Outcome {
  const cs = candles.filter((c) => Number.isFinite(c[0]) && c[4] > 0).sort((a, b) => a[0] - b[0]);
  if (!cs.length) return { kind: "no_data" };
  const t1 = createdAt + HOUR;
  // Three days after the reference point (bought one hour in), not after the launch itself.
  const end = t1 + WINDOW_MS;
  const before = cs.filter((c) => c[0] <= t1);
  const after = cs.filter((c) => c[0] > t1 && c[0] <= end);
  if (!after.length) return { kind: "stopped_first_hour", tradedFirstHour: before.length > 0 };
  // Price at +1h: the last trade at or before it, else the first trade after it (a token that only started
  // trading later is measured from its first price).
  const p1h = before.length ? before[before.length - 1][4] : after[0][1] || after[0][4];
  const p72 = after[after.length - 1][4];
  const minLow = Math.min(...after.map((c) => c[3] > 0 ? c[3] : c[4]));
  return { kind: "traded", p1h, p72, change72: p72 / p1h - 1, maxDrawdown: Math.min(0, minLow / p1h - 1), candlesAfter: after.length };
}

export interface Rates {
  /** Pools with a usable outcome (no_data excluded). */
  n: number;
  stoppedFirstHour: number;
  traded: number;
  halved: number;
  wiped: number;
  upOrFlat: number;
  medianChange72: number | null;
  /** Shares in [0,1]; halved/wiped/upOrFlat are of the pools still trading after the first hour. */
  stoppedShare: number | null;
  halvedShare: number | null;
  halvedCi: [number, number] | null;
  wipedShare: number | null;
  upShare: number | null;
  /** Of ALL measured launches: stopped in the first hour, or halved within 72 h. */
  lostHalfOrMoreShare: number | null;
  lostHalfOrMoreCi: [number, number] | null;
}

export function wilson(k: number, n: number, z = 1.96): [number, number] | null {
  if (!n) return null;
  const p = k / n;
  const d = 1 + (z * z) / n;
  const c = p + (z * z) / (2 * n);
  const m = z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n));
  return [Math.max(0, (c - m) / d), Math.min(1, (c + m) / d)];
}

export function ratesOf(outcomes: Outcome[]): Rates {
  const usable = outcomes.filter((o) => o.kind !== "no_data");
  const traded = usable.filter((o): o is Extract<Outcome, { kind: "traded" }> => o.kind === "traded");
  const stopped = usable.length - traded.length;
  const halved = traded.filter((o) => o.change72 <= -0.5).length;
  const wiped = traded.filter((o) => o.change72 <= -0.9).length;
  const up = traded.filter((o) => o.change72 >= 0).length;
  const sorted = traded.map((o) => o.change72).sort((a, b) => a - b);
  const med = sorted.length ? (sorted.length % 2 ? sorted[(sorted.length - 1) / 2] : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2) : null;
  const share = (k: number, n: number) => (n ? k / n : null);
  return {
    n: usable.length,
    stoppedFirstHour: stopped,
    traded: traded.length,
    halved,
    wiped,
    upOrFlat: up,
    medianChange72: med,
    stoppedShare: share(stopped, usable.length),
    halvedShare: share(halved, traded.length),
    halvedCi: wilson(halved, traded.length),
    wipedShare: share(wiped, traded.length),
    upShare: share(up, traded.length),
    lostHalfOrMoreShare: share(stopped + halved, usable.length),
    lostHalfOrMoreCi: wilson(stopped + halved, usable.length),
  };
}

/** Deterministic pick of up to `k` items (same input + seed → same picks), so sampling is reproducible. */
export function pickSample<T>(items: T[], k: number, seed: number): T[] {
  let s = seed >>> 0 || 1;
  const rnd = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32);
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, k);
}
