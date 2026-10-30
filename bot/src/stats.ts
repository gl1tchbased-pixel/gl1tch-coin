import { safeWriteJson, safeReadJson } from "./lib/safe-io.js";

/**
 * Global scan counters — "X tokens scanned · Y rugs caught" — persisted in the bot's data
 * directory so the number survives restarts. Bumped by the website (via HTTP) and by
 * the bot's own /scan usage, so the homepage counter reflects real, total activity.
 *
 * `scanned` is the all-time total and mixes people's scans with automated ones (Rug Radar
 * sweeps, Watchtower re-scans). Since `splitSince`, every tagged bump also lands in `user` or
 * `auto`, so usage can be reported without the automation inflating it. When the site changes
 * what counts as a person's scan it sends a higher `rev`, and the split restarts from zero so
 * one public number never mixes two counting rules.
 */

export type ScanKind = "user" | "auto";

export interface Stats {
  scanned: number;
  flagged: number;
  user: number;
  auto: number;
  splitSince: number | null; // ms epoch of the first tagged bump
}

const STORE_PATH = process.env.STATS_FILE ?? "/tmp/gl1tch-stats.json";

export class StatsStore {
  private s: Stats = { scanned: 0, flagged: 0, user: 0, auto: 0, splitSince: null };
  private rev = 1; // counting rules behind the current user/auto split
  private loaded = false;
  private dirty = false;

  load(): void {
    if (this.loaded) return;
    this.loaded = true;
    const p = safeReadJson<Partial<Stats> & { splitRev?: number }>(STORE_PATH, "stats");
    if (p) {
      this.s = {
        scanned: Number(p.scanned) || 0,
        flagged: Number(p.flagged) || 0,
        user: Number(p.user) || 0,
        auto: Number(p.auto) || 0,
        splitSince: Number(p.splitSince) || null,
      };
      this.rev = Number(p.splitRev) || 1;
      console.log(`[stats] loaded ${this.s.scanned} scanned (${this.s.user} user / ${this.s.auto} auto) / ${this.s.flagged} flagged from ${STORE_PATH}`);
    }
    // Debounced flush so a burst of bumps writes at most ~once/5s.
    setInterval(() => this.flush(), 5000).unref?.();
  }

  private flush(): void {
    if (!this.dirty) return;
    this.dirty = false;
    try {
      safeWriteJson(STORE_PATH, { ...this.s, splitRev: this.rev });
    } catch (e) {
      console.error("[stats] save failed:", (e as Error).message);
    }
  }

  get(): Stats { return { ...this.s }; }

  /** Untagged bumps (older site deploys) only move the all-time total. */
  bump(flagged: boolean, n = 1, flaggedN = 0, kind?: ScanKind, now = Date.now(), rev = 1): void {
    this.s.scanned += n;
    this.s.flagged += flagged ? 1 : flaggedN;
    if (kind === "user" || kind === "auto") {
      if (rev > this.rev) {
        this.rev = rev;
        this.s.user = 0;
        this.s.auto = 0;
        this.s.splitSince = null;
      }
      this.s[kind] += n;
      if (this.s.splitSince == null) this.s.splitSince = now;
    }
    this.dirty = true;
  }
}

export const statsStore = new StatsStore();
