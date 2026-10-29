import fs from "node:fs";
import path from "node:path";

/**
 * Yield watches: who wants a Telegram ping when a yield they follow changes. Same rule as Watchtower — the
 * same number of slots for everyone, because a safety alert is never token-gated.
 */

export interface YieldBaseline {
  apy: number | null;
  tvlUsd: number | null;
  idleShare: number | null;
}

export interface YieldWatch {
  userId: number;
  chatId: number;
  id: string;
  baseline: YieldBaseline;
  addedAt: number;
}

export const YIELD_WATCH_CAP = 25;

const VOLUME = process.env.RAILWAY_VOLUME_MOUNT_PATH;
const DEFAULT_PATH = process.env.YIELD_WATCH_FILE ?? (VOLUME ? path.join(VOLUME, "gl1tch-yield-watch.json") : "/tmp/gl1tch-yield-watch.json");

export class YieldWatchStore {
  private watches: YieldWatch[] = [];

  constructor(private readonly file = DEFAULT_PATH) {}

  load(): void {
    try {
      const parsed = JSON.parse(fs.readFileSync(this.file, "utf-8")) as { watches?: YieldWatch[] };
      this.watches = Array.isArray(parsed.watches) ? parsed.watches : [];
    } catch {
      this.watches = [];
    }
  }

  private save(): void {
    try {
      fs.mkdirSync(path.dirname(this.file), { recursive: true });
      fs.writeFileSync(this.file, JSON.stringify({ watches: this.watches }));
    } catch (e) {
      console.error("[yield-watch] save failed:", (e as Error).message);
    }
  }

  add(w: Omit<YieldWatch, "addedAt">, now: number): "added" | "exists" | "cap" {
    const mine = this.forUser(w.userId);
    if (mine.some((x) => x.id === w.id)) return "exists";
    if (mine.length >= YIELD_WATCH_CAP) return "cap";
    this.watches.push({ ...w, addedAt: now });
    this.save();
    return "added";
  }

  remove(userId: number, id: string): boolean {
    const before = this.watches.length;
    this.watches = this.watches.filter((w) => !(w.userId === userId && w.id === id));
    if (this.watches.length === before) return false;
    this.save();
    return true;
  }

  forUser(userId: number): YieldWatch[] {
    return this.watches.filter((w) => w.userId === userId);
  }

  all(): YieldWatch[] {
    return [...this.watches];
  }

  setBaseline(userId: number, id: string, baseline: YieldBaseline): void {
    const w = this.watches.find((x) => x.userId === userId && x.id === id);
    if (!w) return;
    w.baseline = baseline;
    this.save();
  }
}

export const yieldWatchStore = new YieldWatchStore();
