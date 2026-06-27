import fs from "node:fs";
import path from "node:path";

/**
 * Watchtower store — durable list of tokens users asked to be alerted about, plus
 * the last-seen safety snapshot so the sweep can detect a *worsening* and ping them.
 *
 * Persistence: JSON file. On Railway this points at the mounted volume (/data) via
 * WATCHTOWER_FILE so watchlists survive redeploys; locally it falls back to /tmp.
 */

export interface Baseline {
  verdict: string;
  score: number;
  lpLockedPct: number | null;
  checks: Record<string, string>; // check key -> status (pass|warn|fail|unknown)
}

export interface WatchEntry {
  userId: number;
  chatId: number; // where to send the alert (group or DM)
  chain: string;
  address: string;
  label: string; // symbol or name for display
  baseline: Baseline;
  addedAt: number;
  lastChecked: number;
}

const STORE_PATH = process.env.WATCHTOWER_FILE ?? "/tmp/gl1tch-watchtower.json";
const key = (userId: number, chain: string, address: string) =>
  `${userId}:${chain.toLowerCase()}:${address.toLowerCase()}`;

export class WatchStore {
  private watches = new Map<string, WatchEntry>();
  private loaded = false;

  load(): void {
    if (this.loaded) return;
    this.loaded = true;
    try {
      const raw = fs.readFileSync(STORE_PATH, "utf-8");
      const parsed = JSON.parse(raw) as { watches?: WatchEntry[] };
      for (const w of parsed.watches ?? []) this.watches.set(key(w.userId, w.chain, w.address), w);
      console.log(`[watch] loaded ${this.watches.size} watches from ${STORE_PATH}`);
    } catch {
      console.log(`[watch] no existing store at ${STORE_PATH} (starting empty)`);
    }
  }

  private save(): void {
    try {
      fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
      fs.writeFileSync(STORE_PATH, JSON.stringify({ watches: [...this.watches.values()] }, null, 2));
    } catch (e) {
      console.error("[watch] save failed:", (e as Error).message);
    }
  }

  add(entry: WatchEntry): void {
    this.watches.set(key(entry.userId, entry.chain, entry.address), entry);
    this.save();
  }

  remove(userId: number, chain: string, address: string): boolean {
    const ok = this.watches.delete(key(userId, chain, address));
    if (ok) this.save();
    return ok;
  }

  /** Remove by user + loose address match (any chain) — for /unwatch by address only. */
  removeByAddress(userId: number, address: string): WatchEntry | null {
    for (const [k, w] of this.watches) {
      if (w.userId === userId && w.address.toLowerCase() === address.toLowerCase()) {
        this.watches.delete(k);
        this.save();
        return w;
      }
    }
    return null;
  }

  listByUser(userId: number): WatchEntry[] {
    return [...this.watches.values()].filter((w) => w.userId === userId).sort((a, b) => a.addedAt - b.addedAt);
  }

  countByUser(userId: number): number {
    return this.listByUser(userId).length;
  }

  has(userId: number, chain: string, address: string): boolean {
    return this.watches.has(key(userId, chain, address));
  }

  all(): WatchEntry[] {
    return [...this.watches.values()];
  }

  /** Update the stored baseline + lastChecked after a sweep. */
  updateBaseline(entry: WatchEntry, baseline: Baseline, checkedAt: number): void {
    const k = key(entry.userId, entry.chain, entry.address);
    const cur = this.watches.get(k);
    if (!cur) return;
    cur.baseline = baseline;
    cur.lastChecked = checkedAt;
    this.save();
  }
}

export const watchStore = new WatchStore();
