/**
 * Price history for a pool that trades rarely. GeckoTerminal only returns candles for periods
 * with trades, so the chart is a step line: the price holds at the last trade until the next one,
 * and only real trades are marked.
 */
export interface Candle { t: number; c: number; v: number }
export interface StepPoint { t: number; c: number; traded: boolean }

const num = (x: unknown) => (typeof x === "number" ? x : typeof x === "string" && x !== "" ? Number(x) : NaN);

/** GeckoTerminal `ohlcv_list` rows `[ts_seconds, o, h, l, c, v]` → ascending candles in ms. */
export function parseGeckoOhlcv(rows: unknown): Candle[] {
  if (!Array.isArray(rows)) return [];
  const out: Candle[] = [];
  for (const r of rows) {
    if (!Array.isArray(r) || r.length < 6) continue;
    const t = num(r[0]) * 1000, c = num(r[4]), v = num(r[5]);
    if (!Number.isFinite(t) || !Number.isFinite(c) || c <= 0) continue;
    out.push({ t, c, v: Number.isFinite(v) ? v : 0 });
  }
  return out.sort((a, b) => a.t - b.t);
}

/** Points for [start, end]: carried-in price at start, every trade inside, carried price at end. */
export function stepSeries(candles: Candle[], start: number, end: number): StepPoint[] {
  const before = candles.filter((x) => x.t < start);
  const inside = candles.filter((x) => x.t >= start && x.t <= end);
  const last = inside.length ? inside[inside.length - 1].c : before.length ? before[before.length - 1].c : null;
  if (last === null) return [];
  const pts: StepPoint[] = [];
  if (before.length) pts.push({ t: start, c: before[before.length - 1].c, traded: false });
  for (const x of inside) pts.push({ t: x.t, c: x.c, traded: true });
  if (!pts.length || pts[pts.length - 1].t < end) pts.push({ t: end, c: last, traded: false });
  return pts;
}
