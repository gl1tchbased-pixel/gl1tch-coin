import fs from "node:fs";
import path from "node:path";
import type { YieldSnapshot } from "./types.js";

/**
 * Durable Yield X-Ray store: the latest snapshot plus per-opportunity history. Free RPCs only serve the
 * latest state, so this history is what turns exchange rates into yields. Hourly points for the last 8
 * days, one point per UTC day before that, nothing older than 120 days.
 */

export interface YieldPoint {
  t: number;
  apy: number | null;
  tvlUsd: number | null;
  rate: string | null;
}

const VOLUME = process.env.RAILWAY_VOLUME_MOUNT_PATH;
const DEFAULT_PATH = process.env.YIELD_FILE ?? (VOLUME ? path.join(VOLUME, "gl1tch-yield.json") : "/tmp/gl1tch-yield.json");

const DAY_MS = 86_400_000;
const HOURLY_FOR_MS = 8 * DAY_MS;
const KEEP_FOR_MS = 120 * DAY_MS;

export class YieldStore {
  private snap: YieldSnapshot | null = null;
  private points = new Map<string, YieldPoint[]>();

  constructor(private readonly file = DEFAULT_PATH) {}

  load(): void {
    try {
      const parsed = JSON.parse(fs.readFileSync(this.file, "utf-8")) as { snapshot?: YieldSnapshot | null; history?: Record<string, YieldPoint[]> };
      this.snap = parsed.snapshot ?? null;
      this.points = new Map(Object.entries(parsed.history ?? {}));
      console.log(`[yield] loaded ${this.points.size} histories from ${this.file}`);
    } catch {
      this.snap = null;
      this.points = new Map();
      console.log(`[yield] no yield store at ${this.file} (starting empty)`);
    }
  }

  save(): void {
    try {
      fs.mkdirSync(path.dirname(this.file), { recursive: true });
      fs.writeFileSync(this.file, JSON.stringify({ snapshot: this.snap, history: Object.fromEntries(this.points) }));
    } catch (e) {
      console.error("[yield] save failed:", (e as Error).message);
    }
  }

  snapshot(): YieldSnapshot | null {
    return this.snap;
  }

  setSnapshot(s: YieldSnapshot): void {
    this.snap = s;
  }

  append(id: string, p: YieldPoint, now: number): void {
    const list = [...(this.points.get(id) ?? []), p].sort((a, b) => a.t - b.t);
    const kept: YieldPoint[] = [];
    for (const x of list) {
      if (x.t < now - KEEP_FOR_MS) continue;
      const prev = kept[kept.length - 1];
      // Older than the hourly window: a later point on the same UTC day replaces the earlier one.
      if (prev && x.t < now - HOURLY_FOR_MS && Math.floor(prev.t / DAY_MS) === Math.floor(x.t / DAY_MS)) kept[kept.length - 1] = x;
      else kept.push(x);
    }
    this.points.set(id, kept);
  }

  history(id: string): YieldPoint[] {
    return [...(this.points.get(id) ?? [])];
  }

  firstSeen(id: string): number | null {
    return this.points.get(id)?.[0]?.t ?? null;
  }

  /** The point closest to `targetMs`, if one lies within `toleranceMs`. */
  nearest(id: string, targetMs: number, toleranceMs: number): YieldPoint | null {
    let best: YieldPoint | null = null;
    for (const p of this.points.get(id) ?? []) {
      const d = Math.abs(p.t - targetMs);
      if (d <= toleranceMs && (!best || d < Math.abs(best.t - targetMs))) best = p;
    }
    return best;
  }
}
