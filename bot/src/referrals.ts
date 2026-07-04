import fs from "node:fs";
import path from "node:path";

/**
 * "Infect a friend" referrals. Each user has a deep link t.me/<bot>?start=ref_<id>;
 * when a NEW user starts the bot through it, the referrer gets +1. Status-only (no paid
 * rewards) — a leaderboard of top infectors. Durable on the Railway /data volume.
 */

const STORE_PATH = process.env.REFERRALS_FILE ?? "/tmp/gl1tch-referrals.json";

interface Data {
  counts: Record<string, number>;   // referrerId -> invites
  names: Record<string, string>;    // referrerId -> display name
  credited: string[];               // new users already counted (one credit each)
}

class ReferralStore {
  private counts = new Map<string, number>();
  private names = new Map<string, string>();
  private credited = new Set<string>();
  private loaded = false;
  private dirty = false;

  load(): void {
    if (this.loaded) return;
    this.loaded = true;
    try {
      const d = JSON.parse(fs.readFileSync(STORE_PATH, "utf-8")) as Partial<Data>;
      for (const [k, v] of Object.entries(d.counts ?? {})) this.counts.set(k, Number(v) || 0);
      for (const [k, v] of Object.entries(d.names ?? {})) this.names.set(k, String(v));
      for (const u of d.credited ?? []) this.credited.add(String(u));
      console.log(`[ref] loaded ${this.counts.size} referrers from ${STORE_PATH}`);
    } catch {
      console.log(`[ref] no existing store at ${STORE_PATH} (starting empty)`);
    }
    setInterval(() => this.flush(), 5000).unref?.();
  }

  private flush(): void {
    if (!this.dirty) return;
    this.dirty = false;
    try {
      fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
      const d: Data = { counts: Object.fromEntries(this.counts), names: Object.fromEntries(this.names), credited: [...this.credited] };
      fs.writeFileSync(STORE_PATH, JSON.stringify(d));
    } catch (e) {
      console.error("[ref] save failed:", (e as Error).message);
    }
  }

  /** Credit `referrerId` for bringing `newUserId`. Returns true if newly credited. */
  record(referrerId: string, newUserId: string, referrerName?: string): boolean {
    if (!referrerId || referrerId === newUserId) return false;
    if (this.credited.has(newUserId)) return false; // each new user counts once, ever
    this.credited.add(newUserId);
    this.counts.set(referrerId, (this.counts.get(referrerId) ?? 0) + 1);
    if (referrerName) this.names.set(referrerId, referrerName);
    this.dirty = true;
    return true;
  }

  setName(userId: string, name: string): void {
    if (this.names.get(userId) !== name) { this.names.set(userId, name); this.dirty = true; }
  }

  count(userId: string): number { return this.counts.get(userId) ?? 0; }

  rank(userId: string): number {
    const mine = this.count(userId);
    if (mine <= 0) return 0;
    let better = 0;
    for (const v of this.counts.values()) if (v > mine) better++;
    return better + 1;
  }

  leaderboard(n = 10): { id: string; name: string; count: number }[] {
    return [...this.counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([id, count]) => ({ id, name: this.names.get(id) ?? `Infector ${id.slice(0, 4)}`, count }));
  }

  total(): number { let t = 0; for (const v of this.counts.values()) t += v; return t; }
}

export const referralStore = new ReferralStore();
