import fs from "node:fs";
import path from "node:path";

/**
 * Durable API-key store (Railway-volume JSON, same pattern as the Signal Graph — no DB).
 * Maps an opaque key → the wallet + its tier. One active key per wallet (re-issue rotates).
 * Tier determines the API rate/depth the key unlocks. Non-custodial: no funds, just access.
 */

const VOLUME = process.env.RAILWAY_VOLUME_MOUNT_PATH;
const STORE_PATH =
  process.env.API_KEYS_FILE ??
  (VOLUME ? path.join(VOLUME, "gl1tch-api-keys.json") : "/tmp/gl1tch-api-keys.json");

export interface ApiKeyRecord {
  key: string;
  wallet: string;
  tier: number; // rank tier (2=Infected … 5=Ghost)
  tierId: string;
  ratePerMin: number;
  issuedAt: number;
}

export class ApiKeyStore {
  private byKey = new Map<string, ApiKeyRecord>();
  private byWallet = new Map<string, string>();
  private loaded = false;

  load(): void {
    if (this.loaded) return;
    this.loaded = true;
    try {
      const parsed = JSON.parse(fs.readFileSync(STORE_PATH, "utf-8")) as { keys?: ApiKeyRecord[] };
      for (const r of parsed.keys ?? []) {
        this.byKey.set(r.key, r);
        this.byWallet.set(r.wallet, r.key);
      }
      console.log(`[apikeys] loaded ${this.byKey.size} keys`);
    } catch {
      console.log(`[apikeys] no store at ${STORE_PATH} (starting empty)`);
    }
  }

  private save(): void {
    try {
      fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
      fs.writeFileSync(STORE_PATH, JSON.stringify({ keys: [...this.byKey.values()] }));
    } catch (e) {
      console.error("[apikeys] save failed:", (e as Error).message);
    }
  }

  /** Issue (or rotate) the wallet's key at the given tier. Returns the record. */
  issue(rec: Omit<ApiKeyRecord, "issuedAt">): ApiKeyRecord {
    const prev = this.byWallet.get(rec.wallet);
    if (prev) this.byKey.delete(prev); // rotate — one active key per wallet
    const full: ApiKeyRecord = { ...rec, issuedAt: Date.now() };
    this.byKey.set(full.key, full);
    this.byWallet.set(full.wallet, full.key);
    this.save();
    return full;
  }

  /** Look up a key's tier/rate (for the site to enforce). Null if unknown. */
  check(key: string): { tier: number; tierId: string; ratePerMin: number } | null {
    const r = this.byKey.get(key);
    return r ? { tier: r.tier, tierId: r.tierId, ratePerMin: r.ratePerMin } : null;
  }

  size(): number {
    return this.byKey.size;
  }
}

export const apiKeys = new ApiKeyStore();
