import path from "node:path";
import { safeReadJson, safeWriteJson } from "../lib/safe-io.js";

/**
 * GL1TCH Guardian — Telegram group auto-scan protection store.
 *
 * Every Telegram group gets the same free daily auto-scan allowance, with no token requirement:
 * safety features are never token-gated. The cap only protects the upstream RPC and data sources.
 * Official GL1TCH community chats have no cap.
 */

export const FREE_DAILY_GROUP_SCANS = 100;

export interface GroupGuardianRecord {
  chatId: string;
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
    return false;
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
  } {
    const id = String(chatId);
    const official = officialGroupIds.some((g) => String(g) === id && String(g).length > 0);
    this.load();
    const rec = this.groups[id];
    const today = dayKey(now);
    const usedToday = rec?.dailyScans?.[today] ?? 0;
    const unlimited = official;
    return {
      chatId: id,
      unlimited,
      official,
      usedToday,
      limit: FREE_DAILY_GROUP_SCANS,
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
  } {
    const id = String(chatId);
    const official = officialGroupIds.some((g) => String(g) === id && String(g).length > 0);
    const rec = this.ensure(id);
    const today = dayKey(now);
    this.pruneOldDays(rec, today);

    const unlimited = official;
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
    };
  }
}

export const guardianStore = new GuardianStore();

