// Watchtower rules for the phone: what counts as "this token got riskier". Same rules as the Telegram bot's
// Watchtower (bot/src/watch): a worse verdict, a check that slid pass → warn → fail, or an LP lock that dropped
// 20+ points. Pure functions only (no React Native imports), so they are unit-tested in CI.
import type { CheckStatus, ScanResult, Verdict } from "./scan";

/** Tokens one phone can watch. Keeps the background re-check short and gentle on the free scan API. */
export const WATCH_CAP = 10;

const VERDICT_ORDER: Verdict[] = ["CLEAN", "LOW RISK", "CAUTION", "HIGH RISK", "RUG-SHAPED"];
// "unknown" has no rank on purpose: a source that timed out must never look like a change.
const SEV: Partial<Record<CheckStatus, number>> = { pass: 0, warn: 1, fail: 2 };
const LP_KEY = "lp_lock";
const LP_DROP_POINTS = 20;

export interface Baseline {
  verdict: Verdict;
  score: number;
  checks: Record<string, CheckStatus>; // by check key
  labels: Record<string, string>; // key → human label, for the alert text
  lpPct: number | null;
}

export interface WatchItem {
  chain: string;
  mint: string;
  symbol: string | null;
  baseline: Baseline;
  addedAt: number;
  checkedAt: number;
}

function parsePct(value: string): number | null {
  const m = value.match(/(\d+(?:\.\d+)?)\s*%/);
  return m ? Number(m[1]) : null;
}

export function baselineFrom(r: ScanResult): Baseline {
  const checks: Record<string, CheckStatus> = {};
  const labels: Record<string, string> = {};
  let lpPct: number | null = null;
  for (const c of r.checks) {
    checks[c.key] = c.status;
    labels[c.key] = c.label;
    if (c.key === LP_KEY) lpPct = parsePct(c.value);
  }
  return { verdict: r.verdict, score: r.score, checks, labels, lpPct };
}

/** Plain-language list of what got worse since `prev` (empty = nothing got worse). */
export function worsened(prev: Baseline, cur: Baseline): string[] {
  const out: string[] = [];
  const oi = VERDICT_ORDER.indexOf(prev.verdict);
  const ni = VERDICT_ORDER.indexOf(cur.verdict);
  if (oi !== -1 && ni !== -1 && ni > oi) out.push(`Verdict ${prev.verdict} → ${cur.verdict}`);

  const lpByPct = prev.lpPct != null && cur.lpPct != null;
  for (const [key, status] of Object.entries(cur.checks)) {
    if (key === LP_KEY && lpByPct) continue; // compared precisely below
    const a = SEV[prev.checks[key]];
    const b = SEV[status];
    if (a != null && b != null && b > a) out.push(`${cur.labels[key] ?? key}: ${prev.checks[key]} → ${status}`);
  }

  if (lpByPct && prev.lpPct! - cur.lpPct! >= LP_DROP_POINTS) {
    out.push(`${cur.labels[LP_KEY] ?? "LP lock"}: ${prev.lpPct}% → ${cur.lpPct}%`);
  }
  return out;
}

/**
 * The baseline to compare against next time. Adopts the new state (one alert per change), except where the new
 * read is degraded: an UNKNOWN verdict, an "unknown" check or an unreadable LP percent keeps the last known value,
 * so a real drop after a timeout still alerts.
 */
export function mergeBaseline(prev: Baseline, cur: Baseline): Baseline {
  const checks = { ...prev.checks };
  for (const [key, status] of Object.entries(cur.checks)) if (status !== "unknown") checks[key] = status;
  const known = cur.verdict !== "UNKNOWN";
  return {
    verdict: known ? cur.verdict : prev.verdict,
    score: known ? cur.score : prev.score,
    checks,
    labels: { ...prev.labels, ...cur.labels },
    lpPct: cur.lpPct ?? prev.lpPct,
  };
}

const same = (w: { chain: string; mint: string }, chain: string, mint: string) => w.chain === chain && w.mint === mint;

/** Newest first; watching a token again refreshes its baseline. `full` = cap reached, list unchanged. */
export function addWatch(list: WatchItem[], r: ScanResult, now = Date.now()): { list: WatchItem[]; full: boolean } {
  const exists = list.some((w) => same(w, r.chain, r.mint));
  if (!exists && list.length >= WATCH_CAP) return { list, full: true };
  const item: WatchItem = { chain: r.chain, mint: r.mint, symbol: r.symbol, baseline: baselineFrom(r), addedAt: now, checkedAt: now };
  return { list: [item, ...list.filter((w) => !same(w, r.chain, r.mint))], full: false };
}

export function removeWatch(list: WatchItem[], chain: string, mint: string): WatchItem[] {
  return list.filter((w) => !same(w, chain, mint));
}
