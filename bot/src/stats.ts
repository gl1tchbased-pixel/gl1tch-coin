import fs from "node:fs";
import path from "node:path";

/**
 * Global scan counters — "X tokens scanned · Y rugs caught" — persisted on the Railway
 * /data volume so the number survives restarts. Bumped by the website (via HTTP) and by
 * the bot's own /scan usage, so the homepage counter reflects real, total activity.
 */

interface Stats { scanned: number; flagged: number }

const STORE_PATH = process.env.STATS_FILE ?? "/tmp/gl1tch-stats.json";

class StatsStore {
  private s: Stats = { scanned: 0, flagged: 0 };
  private loaded = false;
  private dirty = false;

  load(): void {
    if (this.loaded) return;
    this.loaded = true;
    try {
      const p = JSON.parse(fs.readFileSync(STORE_PATH, "utf-8")) as Partial<Stats>;
      this.s = { scanned: Number(p.scanned) || 0, flagged: Number(p.flagged) || 0 };
      console.log(`[stats] loaded ${this.s.scanned} scanned / ${this.s.flagged} flagged from ${STORE_PATH}`);
    } catch {
      console.log(`[stats] no existing store at ${STORE_PATH} (starting at 0)`);
    }
    // Debounced flush so a burst of bumps writes at most ~once/5s.
    setInterval(() => this.flush(), 5000).unref?.();
  }

  private flush(): void {
    if (!this.dirty) return;
    this.dirty = false;
    try {
      fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
      fs.writeFileSync(STORE_PATH, JSON.stringify(this.s));
    } catch (e) {
      console.error("[stats] save failed:", (e as Error).message);
    }
  }

  get(): Stats { return { ...this.s }; }

  bump(flagged: boolean, n = 1, flaggedN = 0): void {
    this.s.scanned += n;
    this.s.flagged += flagged ? 1 : flaggedN;
    this.dirty = true;
  }
}

export const statsStore = new StatsStore();
