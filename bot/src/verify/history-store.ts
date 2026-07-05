import fs from "node:fs";
import path from "node:path";
import { recordSnapshot, type BalanceSnapshot } from "./sustained.js";

/**
 * Durable per-wallet balance-history store (PREMIUM-PLAN-v3, Phase 0). Every verification
 * appends a snapshot; the trailing 7-day window feeds the sustained-balance anti-gaming
 * check (see ./sustained.ts). This is also the seed of the Signal Graph's balance-over-time
 * axis. Durable on the Railway /data volume.
 */

// Durable by default: prefer an explicit override, else the Railway volume mount (auto-set
// when a volume is attached), else /tmp. No manual env var needed for persistence.
const VOLUME = process.env.RAILWAY_VOLUME_MOUNT_PATH;
const STORE_PATH =
  process.env.BALANCE_HISTORY_FILE ??
  (VOLUME ? path.join(VOLUME, "gl1tch-balance-history.json") : "/tmp/gl1tch-balance-history.json");

export class BalanceHistoryStore {
  private byWallet = new Map<string, BalanceSnapshot[]>();
  private loaded = false;

  load(): void {
    if (this.loaded) return;
    this.loaded = true;
    try {
      const parsed = JSON.parse(fs.readFileSync(STORE_PATH, "utf-8")) as {
        wallets?: Record<string, BalanceSnapshot[]>;
      };
      for (const [w, snaps] of Object.entries(parsed.wallets ?? {})) this.byWallet.set(w, snaps);
      console.log(`[verify] loaded balance history for ${this.byWallet.size} wallets from ${STORE_PATH}`);
    } catch {
      console.log(`[verify] no balance history at ${STORE_PATH} (starting empty)`);
    }
  }

  private save(): void {
    try {
      fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
      const wallets: Record<string, BalanceSnapshot[]> = {};
      for (const [w, snaps] of this.byWallet) wallets[w] = snaps;
      fs.writeFileSync(STORE_PATH, JSON.stringify({ wallets }, null, 2));
    } catch (e) {
      console.error("[verify] balance-history save failed:", (e as Error).message);
    }
  }

  get(wallet: string): BalanceSnapshot[] {
    return this.byWallet.get(wallet) ?? [];
  }

  /** Append a snapshot for a wallet and persist. Returns the updated (pruned) history. */
  record(wallet: string, balance: number, now: number = Date.now()): BalanceSnapshot[] {
    const next = recordSnapshot(this.get(wallet), balance, now);
    this.byWallet.set(wallet, next);
    this.save();
    return next;
  }
}

export const balanceHistory = new BalanceHistoryStore();
