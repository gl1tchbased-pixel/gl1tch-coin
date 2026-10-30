import path from "node:path";
import { safeReadJson, safeWriteJson } from "../lib/safe-io.js";

/**
 * GL1TCH Guardian — Telegram group auto-scan protection store.
 *
 * External Telegram groups get 15 automatic contract scans per UTC day for free.
 * Any group administrator with a verified $GL1TCH holding (/verify) can run
 * `/guardian unlock` inside their group to unlock Unlimited Guardian Protection.
 * Official GL1TCH community chats are always unlimited.
 */

export const FREE_DAILY_GROUP_SCANS = 15;

export interface GroupGuardianRecord {
  chatId: string;
  unlockedByUserId?: number;
  unlockedByUsername?: string;
  unlockedTierId?: string;
  unlockedBalance?: number;
  unlockedAt?: number;
  /** UTC day (YYYY-MM-DD) -> auto-scan count */
  dailyScans: Record<string, number>;
  /** Last UTC day on which the "daily free limit reached" notice was sent */
  limitNotifiedDay?: string;
}

interface PersistedGuardian {
  groups: Record<string, GroupGuardianRecord>;
}

const VOLUME = process.env.RAILWAY_VOLUME_MOUNT_PATH;
const DEFAULT_PATH =
  process.env.GUARDIAN_FILE ??
  (VOLUME ? path.join(VOLUME, "gl1tch-guardian.json") : "/tmp/gl1tch-guardian.json");

const dayKey = (ms = Date.now()): string => new Date(ms).toISOString().slice(0, 10);

export class GuardianStore {
  private groups: Record<string, GroupGuardianRecord> = {};
  private loaded = false;

  constructor(private readonly filePath = DEFAULT_PATH) {}

  load(): void {
    if (this.loaded) return;
    this.loaded = true;
    const data = safeReadJson<PersistedGuardian>(this.filePath, "guardian");
    if (data && data.groups && typeof data.groups === "object") {
      this.groups = data.groups;
    }
  }

  private save(): void {
    try {
      safeWriteJson(this.filePath, { groups: this.groups });
    } catch (e) {
      console.error("[guardian] save failed:", (e as Error).message);
    }
  }

  private ensure(id: string): GroupGuardianRecord {
    this.load();
    return (this.groups[id] ??= { chatId: id, dailyScans: {} });
  }

  private pruneOldDays(rec: GroupGuardianRecord, today: string): void {
    for (const d of Object.keys(rec.dailyScans)) {
      if (d < today) delete rec.dailyScans[d];
    }
  }

  isUnlimited(chatId: number | string, officialGroupIds: Array<string | number> = []): boolean {
    const id = String(chatId);
    if (officialGroupIds.some((g) => String(g) === id && String(g).length > 0)) return true;
    this.load();
    const rec = this.groups[id];
    return Boolean(rec?.unlockedByUserId && (rec.unlockedBalance ?? 0) > 0);
  }

  unlockGroup(
    chatId: number | string,
    info: { userId: number; username?: string; tierId: string; balance: number },
    now = Date.now()
  ): GroupGuardianRecord {
    const id = String(chatId);
    const rec = this.ensure(id);
    rec.unlockedByUserId = info.userId;
    rec.unlockedByUsername = info.username;
    rec.unlockedTierId = info.tierId;
    rec.unlockedBalance = info.balance;
    rec.unlockedAt = now;
    this.save();
    return rec;
  }

  getStatus(
    chatId: number | string,
    officialGroupIds: Array<string | number> = [],
    now = Date.now()
  ): {
    chatId: string;
    unlimited: boolean;
    official: boolean;
    usedToday: number;
    limit: number;
    unlockedByUsername?: string;
    unlockedTierId?: string;
    unlockedBalance?: number;
  } {
    const id = String(chatId);
    const official = officialGroupIds.some((g) => String(g) === id && String(g).length > 0);
    this.load();
    const rec = this.groups[id];
    const today = dayKey(now);
    const usedToday = rec?.dailyScans?.[today] ?? 0;
    const unlimited = official || Boolean(rec?.unlockedByUserId && (rec.unlockedBalance ?? 0) > 0);
    return {
      chatId: id,
      unlimited,
      official,
      usedToday,
      limit: FREE_DAILY_GROUP_SCANS,
      unlockedByUsername: rec?.unlockedByUsername,
      unlockedTierId: rec?.unlockedTierId,
      unlockedBalance: rec?.unlockedBalance,
    };
  }

  checkAndRecordAutoScan(
    chatId: number | string,
    officialGroupIds: Array<string | number> = [],
    now = Date.now()
  ): {
    allowed: boolean;
    unlimited: boolean;
    official: boolean;
    usedToday: number;
    limit: number;
    shouldNotifyLimit: boolean;
    unlockedByUsername?: string;
  } {
    const id = String(chatId);
    const official = officialGroupIds.some((g) => String(g) === id && String(g).length > 0);
    const rec = this.ensure(id);
    const today = dayKey(now);
    this.pruneOldDays(rec, today);

    const unlimited = official || Boolean(rec.unlockedByUserId && (rec.unlockedBalance ?? 0) > 0);
    const current = rec.dailyScans[today] ?? 0;

    if (!unlimited && current >= FREE_DAILY_GROUP_SCANS) {
      const shouldNotifyLimit = rec.limitNotifiedDay !== today;
      if (shouldNotifyLimit) {
        rec.limitNotifiedDay = today;
        this.save();
      }
      return {
        allowed: false,
        unlimited: false,
        official: false,
        usedToday: current,
        limit: FREE_DAILY_GROUP_SCANS,
        shouldNotifyLimit,
      };
    }

    rec.dailyScans[today] = current + 1;
    this.save();
    return {
      allowed: true,
      unlimited,
      official,
      usedToday: current + 1,
      limit: FREE_DAILY_GROUP_SCANS,
      shouldNotifyLimit: false,
      unlockedByUsername: rec.unlockedByUsername,
    };
  }
}

export const guardianStore = new GuardianStore();

