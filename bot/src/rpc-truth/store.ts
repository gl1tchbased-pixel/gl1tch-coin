import path from "node:path";
import { safeReadJson, safeWriteJson } from "../lib/safe-io.js";
import type { Grade } from "./judge.js";
import type { DepthId } from "./registry.js";
import type { TruthSnapshot } from "./probe.js";

/**
 * Durable RPC Truth store: the latest measurement pass plus a compact per-endpoint record of every pass in the
 * last 30 days, so the page can say "silent failures in 3 of the last 28 checks", not just "today".
 */

export interface PassRecord {
  t: number;
  g: Grade;
  /** Silent empties + mismatches in that pass. */
  s: number;
  r: DepthId | null;
  l: number | null;
}

export interface EndpointRecord {
  runs7d: number;
  silentRuns7d: number;
  trustedRuns7d: number;
  downRuns7d: number;
  lastSilentAt: number | null;
  firstSeenAt: number;
}

export interface TruthView extends TruthSnapshot {
  intervalMs: number;
  nextRunAt: number;
  records: Record<string, EndpointRecord>;
}

const VOLUME = process.env.RAILWAY_VOLUME_MOUNT_PATH;
const DEFAULT_PATH = process.env.RPC_TRUTH_FILE ?? (VOLUME ? path.join(VOLUME, "gl1tch-rpc-truth.json") : "/tmp/gl1tch-rpc-truth.json");
const DAY = 86_400_000;
const KEEP_MS = 30 * DAY;

export class TruthStore {
  private latest: TruthSnapshot | null = null;
  private history = new Map<string, PassRecord[]>();

  constructor(private readonly file = DEFAULT_PATH, readonly intervalMs = 6 * 3_600_000) {}

  load(): void {
    const parsed = safeReadJson<{ latest?: TruthSnapshot | null; history?: Record<string, PassRecord[]> }>(this.file, "rpc-truth");
    this.latest = parsed?.latest ?? null;
    this.history = new Map(Object.entries(parsed?.history ?? {}));
    if (parsed) console.log(`[rpc-truth] loaded ${this.history.size} endpoint histories from ${this.file}`);
  }

  save(): void {
    try {
      safeWriteJson(this.file, { latest: this.latest, history: Object.fromEntries(this.history) });
    } catch (e) {
      console.error("[rpc-truth] save failed:", (e as Error).message);
    }
  }

  record(snap: TruthSnapshot): void {
    this.latest = snap;
    const cutoff = snap.finishedAt - KEEP_MS;
    for (const c of snap.chains) {
      for (const e of c.endpoints) {
        const list = (this.history.get(e.id) ?? []).filter((p) => p.t >= cutoff);
        list.push({ t: snap.finishedAt, g: e.grade, s: e.silentCount, r: e.reach, l: e.latencyMs });
        this.history.set(e.id, list);
      }
    }
    for (const [id, list] of this.history) {
      const kept = list.filter((p) => p.t >= cutoff);
      if (kept.length) this.history.set(id, kept);
      else this.history.delete(id);
    }
    this.save();
  }

  lastFinishedAt(): number | null {
    return this.latest?.finishedAt ?? null;
  }

  historyOf(id: string): PassRecord[] {
    return [...(this.history.get(id) ?? [])];
  }

  view(now = Date.now()): TruthView | null {
    if (!this.latest) return null;
    const from = now - 7 * DAY;
    const records: Record<string, EndpointRecord> = {};
    for (const c of this.latest.chains) {
      for (const e of c.endpoints) {
        const all = this.history.get(e.id) ?? [];
        const week = all.filter((p) => p.t >= from);
        const silent = all.filter((p) => p.s > 0);
        records[e.id] = {
          runs7d: week.length,
          silentRuns7d: week.filter((p) => p.s > 0).length,
          trustedRuns7d: week.filter((p) => p.g === "trusted").length,
          downRuns7d: week.filter((p) => p.g === "down").length,
          lastSilentAt: silent.length ? silent[silent.length - 1].t : null,
          firstSeenAt: all.length ? all[0].t : this.latest.finishedAt,
        };
      }
    }
    return { ...this.latest, intervalMs: this.intervalMs, nextRunAt: this.latest.finishedAt + this.intervalMs, records };
  }
}

export const truthStore = new TruthStore();
