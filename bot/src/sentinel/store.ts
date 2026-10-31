import path from "node:path";
import { safeReadJson, safeWriteJson } from "../lib/safe-io.js";

export interface SentinelSubscriber {
  userId: number;
  username?: string;
  plan: "holder" | "stars" | "usdc";
  subscribedAt: number;
  expiresAt: number;
}

export interface SentinelGemAlert {
  mint: string;
  symbol: string;
  name: string;
  score: number;
  verdict: string;
  lpLockedPct: number;
  alertedAt: number;
}

interface PersistedSentinel {
  subscribers: Record<string, SentinelSubscriber>;
  recentAlerts: SentinelGemAlert[];
}

const VOLUME = process.env.RAILWAY_VOLUME_MOUNT_PATH;
const DEFAULT_PATH =
  process.env.SENTINEL_FILE ??
  (VOLUME ? path.join(VOLUME, "gl1tch-sentinel.json") : "/tmp/gl1tch-sentinel.json");

export class SentinelStore {
  private subscribers: Record<string, SentinelSubscriber> = {};
  private recentAlerts: SentinelGemAlert[] = [];
  private loaded = false;

  constructor(private readonly filePath = DEFAULT_PATH) {}

  load(): void {
    if (this.loaded) return;
    this.loaded = true;
    const data = safeReadJson<PersistedSentinel>(this.filePath, "sentinel");
    if (data) {
      if (data.subscribers) this.subscribers = data.subscribers;
      if (Array.isArray(data.recentAlerts)) this.recentAlerts = data.recentAlerts;
    }
  }

  private save(): void {
    try {
      safeWriteJson(this.filePath, {
        subscribers: this.subscribers,
        recentAlerts: this.recentAlerts.slice(-50),
      });
    } catch (e) {
      console.error("[sentinel] save failed:", (e as Error).message);
    }
  }

  addSubscriber(sub: SentinelSubscriber): void {
    this.load();
    this.subscribers[String(sub.userId)] = sub;
    this.save();
  }

  getSubscriber(userId: number): SentinelSubscriber | null {
    this.load();
    const s = this.subscribers[String(userId)];
    if (!s) return null;
    if (s.expiresAt < Date.now()) {
      delete this.subscribers[String(userId)];
      this.save();
      return null;
    }
    return s;
  }

  isSubscribed(userId: number): boolean {
    return this.getSubscriber(userId) !== null;
  }

  recordAlert(alert: SentinelGemAlert): boolean {
    this.load();
    const exists = this.recentAlerts.some(
      (a) => a.mint.toLowerCase() === alert.mint.toLowerCase() && Date.now() - a.alertedAt < 86_400_000
    );
    if (exists) return false;
    this.recentAlerts.push(alert);
    if (this.recentAlerts.length > 50) this.recentAlerts.shift();
    this.save();
    return true;
  }

  getRecentGems(limit = 5): SentinelGemAlert[] {
    this.load();
    return [...this.recentAlerts].reverse().slice(0, limit);
  }
}

export const sentinelStore = new SentinelStore();

