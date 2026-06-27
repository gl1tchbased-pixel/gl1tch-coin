import fs from "node:fs";
import path from "node:path";

/**
 * Wallet-watch store — wallets a user asked to monitor (a whale, a dev, or their own
 * portfolio) plus the last-seen holdings snapshot, so the sweep can detect a big
 * move-out (sell/transfer) and ping them. Durable on the Railway /data volume.
 */

export interface WalletBaseline {
  sol: number;
  tokens: Record<string, number>; // mint -> UI amount held
}

export interface WalletEntry {
  userId: number;
  chatId: number;
  address: string;
  label: string;
  baseline: WalletBaseline;
  addedAt: number;
  lastChecked: number;
}

const STORE_PATH = process.env.WALLET_WATCH_FILE ?? "/tmp/gl1tch-wallet-watch.json";
const key = (userId: number, address: string) => `${userId}:${address}`;

export class WalletStore {
  private wallets = new Map<string, WalletEntry>();
  private loaded = false;

  load(): void {
    if (this.loaded) return;
    this.loaded = true;
    try {
      const parsed = JSON.parse(fs.readFileSync(STORE_PATH, "utf-8")) as { wallets?: WalletEntry[] };
      for (const w of parsed.wallets ?? []) this.wallets.set(key(w.userId, w.address), w);
      console.log(`[wallet] loaded ${this.wallets.size} watched wallets from ${STORE_PATH}`);
    } catch {
      console.log(`[wallet] no existing store at ${STORE_PATH} (starting empty)`);
    }
  }

  private save(): void {
    try {
      fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
      fs.writeFileSync(STORE_PATH, JSON.stringify({ wallets: [...this.wallets.values()] }, null, 2));
    } catch (e) {
      console.error("[wallet] save failed:", (e as Error).message);
    }
  }

  add(entry: WalletEntry): void { this.wallets.set(key(entry.userId, entry.address), entry); this.save(); }
  has(userId: number, address: string): boolean { return this.wallets.has(key(userId, address)); }
  countByUser(userId: number): number { return this.listByUser(userId).length; }
  listByUser(userId: number): WalletEntry[] {
    return [...this.wallets.values()].filter((w) => w.userId === userId).sort((a, b) => a.addedAt - b.addedAt);
  }
  removeByAddress(userId: number, address: string): WalletEntry | null {
    for (const [k, w] of this.wallets) {
      if (w.userId === userId && w.address.toLowerCase() === address.toLowerCase()) { this.wallets.delete(k); this.save(); return w; }
    }
    return null;
  }
  all(): WalletEntry[] { return [...this.wallets.values()]; }
  updateBaseline(entry: WalletEntry, baseline: WalletBaseline, checkedAt: number): void {
    const cur = this.wallets.get(key(entry.userId, entry.address));
    if (!cur) return;
    cur.baseline = baseline; cur.lastChecked = checkedAt; this.save();
  }
}

export const walletStore = new WalletStore();
