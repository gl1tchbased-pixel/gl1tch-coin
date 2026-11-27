import path from "node:path";
import { safeReadJson, safeWriteJson } from "../lib/safe-io.js";
import { HOUR, ratesOf, type Outcome, type Rates } from "./outcome.js";

/**
 * New Token Reality store: tokens sampled at birth (one per pool), their 72-hour outcome once it is known, and the
 * per-chain rates the website shows. Kept 45 days.
 */

export type RealityChain = "solana" | "ethereum" | "base" | "bsc" | "arbitrum" | "polygon";
export const REALITY_CHAINS: RealityChain[] = ["solana", "ethereum", "base", "bsc", "arbitrum", "polygon"];

export interface SampledToken {
  chain: RealityChain;
  pool: string;
  token: string;
  dex: string;
  createdAt: number;
  sampledAt: number;
  outcome?: Outcome;
  evaluatedAt?: number;
  attempts?: number;
}

export interface ChainReality {
  chain: RealityChain;
  /** Launches whose 72-hour window closed in the last 7 days. */
  week: Rates & { from: number; to: number };
  /** Same, over everything still kept (up to ~42 days of launches). */
  all: Rates;
  byDex: { dex: string; n: number; lostHalfOrMoreShare: number | null }[];
  weekly: { weekStart: number; n: number; lostHalfOrMoreShare: number | null; halvedShare: number | null; stoppedShare: number | null }[];
  sampled: number;
  awaiting: number;
  /** When the first 72-hour outcome is (or was) due. */
  firstResultAt: number | null;
}

export interface RealityView {
  version: 1;
  updatedAt: number;
  startedAt: number | null;
  /** Minimum sample before a share is published. */
  minSample: number;
  chains: ChainReality[];
}

const VOLUME = process.env.RAILWAY_VOLUME_MOUNT_PATH;
const DEFAULT_PATH = process.env.TOKEN_REALITY_FILE ?? (VOLUME ? path.join(VOLUME, "gl1tch-token-reality.json") : "/tmp/gl1tch-token-reality.json");
const DAY = 24 * HOUR;
const KEEP_MS = 45 * DAY;
/** Launch + 1 h reference + 72 h window + 1 h for the last candles to be indexed. */
export const EVAL_AFTER_MS = 74 * HOUR;
export const MIN_SAMPLE = 30;

/** Monday 00:00 UTC of the week containing t. */
export function weekStart(t: number): number {
  const d = new Date(t);
  const day = (d.getUTCDay() + 6) % 7;
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day);
}

export class RealityStore {
  private tokens = new Map<string, SampledToken>();
  private seenPools = new Map<string, number>();
  private startedAt: number | null = null;
  private lastCycleAt: number | null = null;

  constructor(private readonly file = DEFAULT_PATH) {}

  load(): void {
    const parsed = safeReadJson<{ tokens?: SampledToken[]; seen?: Record<string, number>; startedAt?: number | null; lastCycleAt?: number | null }>(this.file, "token-reality");
    this.tokens = new Map((parsed?.tokens ?? []).map((t) => [key(t.chain, t.pool), t]));
    this.seenPools = new Map(Object.entries(parsed?.seen ?? {}));
    this.startedAt = parsed?.startedAt ?? null;
    this.lastCycleAt = parsed?.lastCycleAt ?? null;
    if (parsed) console.log(`[token-reality] loaded ${this.tokens.size} sampled tokens from ${this.file}`);
  }

  save(): void {
    try {
      safeWriteJson(this.file, { tokens: [...this.tokens.values()], seen: Object.fromEntries(this.seenPools), startedAt: this.startedAt, lastCycleAt: this.lastCycleAt });
    } catch (e) {
      console.error("[token-reality] save failed:", (e as Error).message);
    }
  }

  lastCycle(): number | null {
    return this.lastCycleAt;
  }

  setLastCycle(t: number): void {
    this.lastCycleAt = t;
    this.save();
  }

  /** A pool we already looked at (sampled or rejected) is never considered again. */
  seen(chain: RealityChain, pool: string): boolean {
    return this.seenPools.has(key(chain, pool));
  }

  markSeen(chain: RealityChain, pool: string, now: number): void {
    this.seenPools.set(key(chain, pool), now);
  }

  add(t: SampledToken): void {
    this.startedAt ??= t.sampledAt;
    this.tokens.set(key(t.chain, t.pool), t);
    this.markSeen(t.chain, t.pool, t.sampledAt);
  }

  due(now: number, limit: number): SampledToken[] {
    return [...this.tokens.values()]
      .filter((t) => !t.outcome && t.createdAt + EVAL_AFTER_MS <= now && (t.attempts ?? 0) < 3)
      .sort((a, b) => a.createdAt - b.createdAt)
      .slice(0, limit);
  }

  setOutcome(chain: RealityChain, pool: string, outcome: Outcome | null, now: number): void {
    const t = this.tokens.get(key(chain, pool));
    if (!t) return;
    if (outcome) {
      t.outcome = outcome;
      t.evaluatedAt = now;
    } else t.attempts = (t.attempts ?? 0) + 1;
  }

  prune(now: number): void {
    for (const [k, t] of this.tokens) if (t.createdAt < now - KEEP_MS) this.tokens.delete(k);
    for (const [k, at] of this.seenPools) if (at < now - KEEP_MS) this.seenPools.delete(k);
  }

  all(): SampledToken[] {
    return [...this.tokens.values()];
  }

  view(now = Date.now()): RealityView {
    const chains = REALITY_CHAINS.map((chain): ChainReality => {
      const mine = [...this.tokens.values()].filter((t) => t.chain === chain);
      const done = mine.filter((t) => t.outcome);
      // A launch's window closes 72 h after it opened; "this week" = windows that closed in the last 7 days.
      const to = now - EVAL_AFTER_MS;
      const from = to - 7 * DAY;
      const week = done.filter((t) => t.createdAt > from && t.createdAt <= to);
      const dexes = new Map<string, Outcome[]>();
      for (const t of done) dexes.set(t.dex, [...(dexes.get(t.dex) ?? []), t.outcome!]);
      const weeks = new Map<number, Outcome[]>();
      for (const t of done) {
        const w = weekStart(t.createdAt);
        weeks.set(w, [...(weeks.get(w) ?? []), t.outcome!]);
      }
      const pending = mine.filter((t) => !t.outcome);
      const firstDue = mine.length ? Math.min(...mine.map((t) => t.createdAt)) + EVAL_AFTER_MS : null;
      return {
        chain,
        week: { ...ratesOf(week.map((t) => t.outcome!)), from, to },
        all: ratesOf(done.map((t) => t.outcome!)),
        byDex: [...dexes.entries()]
          .map(([dex, os]) => {
            const r = ratesOf(os);
            return { dex, n: r.n, lostHalfOrMoreShare: r.lostHalfOrMoreShare };
          })
          .sort((a, b) => b.n - a.n),
        weekly: [...weeks.entries()]
          .sort((a, b) => a[0] - b[0])
          .map(([w, os]) => {
            const r = ratesOf(os);
            return { weekStart: w, n: r.n, lostHalfOrMoreShare: r.lostHalfOrMoreShare, halvedShare: r.halvedShare, stoppedShare: r.stoppedShare };
          }),
        sampled: mine.length,
        awaiting: pending.length,
        firstResultAt: firstDue,
      };
    });
    return { version: 1, updatedAt: now, startedAt: this.startedAt, minSample: MIN_SAMPLE, chains };
  }
}

const key = (chain: string, pool: string) => `${chain}:${pool}`;

export const realityStore = new RealityStore();
