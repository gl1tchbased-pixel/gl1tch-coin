import path from "node:path";
import { safeWriteJson, safeReadJson } from "../lib/safe-io.js";
import { computeXp, signalBadge, type SignalBadge } from "./xp.js";

/**
 * Durable Proof-of-Signal ledger (PREMIUM-PLAN-v3, Phase 0). Holds each user's verified
 * sustained-holding tier; referral counts are read live from the referral store (single
 * source of truth) at leaderboard time. Durable on the Railway volume (auto-detected mount).
 */

interface PoSRecord {
  userId: string;
  username: string;
  tierRank: number; // 0..5 (sustained tier reached)
  confirmed: boolean; // sustained (not provisional)
  updatedAt: number;
}

export interface SignalRep {
  userId: string;
  username: string;
  tierRank: number;
  confirmed: boolean;
  referrals: number;
  xp: number;
  badge: SignalBadge;
}

const VOLUME = process.env.RAILWAY_VOLUME_MOUNT_PATH;
const STORE_PATH =
  process.env.PROOF_OF_SIGNAL_FILE ??
  (VOLUME ? path.join(VOLUME, "gl1tch-proof-of-signal.json") : "/tmp/gl1tch-proof-of-signal.json");

/** Resolve a user's live referral count (injected to keep the referral store the sole owner). */
export type RefCount = (userId: string) => number;

export class ProofOfSignalStore {
  private byUser = new Map<string, PoSRecord>();
  private loaded = false;
  private dirty = false;

  load(): void {
    if (this.loaded) return;
    this.loaded = true;
    const parsed = safeReadJson<{ users?: PoSRecord[] }>(STORE_PATH, "pos");
    if (parsed) {
      for (const u of parsed.users ?? []) this.byUser.set(u.userId, u);
      console.log(`[pos] loaded ${this.byUser.size} signal reputations from ${STORE_PATH}`);
    }
    setInterval(() => this.flush(), 5000).unref?.();
  }

  private flush(): void {
    if (!this.dirty) return;
    this.dirty = false;
    try {
      safeWriteJson(STORE_PATH, { users: [...this.byUser.values()] });
    } catch (e) {
      console.error("[pos] save failed:", (e as Error).message);
    }
  }

  /** Record/update a user's verified sustained-holding tier. Keeps the best confirmed tier. */
  syncHolder(userId: string, username: string, tierRank: number, confirmed: boolean, now = Date.now()): void {
    const prev = this.byUser.get(userId);
    // Never downgrade a confirmed tier on a transient low read; take the max standing.
    const nextRank = prev ? Math.max(prev.tierRank, tierRank) : tierRank;
    const nextConfirmed = confirmed || (!!prev?.confirmed && prev.tierRank >= tierRank);
    this.byUser.set(userId, {
      userId,
      username: username || prev?.username || `Node ${userId.slice(0, 4)}`,
      tierRank: nextRank,
      confirmed: nextConfirmed,
      updatedAt: now,
    });
    this.dirty = true;
  }

  private toRep(r: PoSRecord, refCount: RefCount): SignalRep {
    const referrals = refCount(r.userId);
    const xp = computeXp({ verifiedTierRank: r.tierRank, confirmed: r.confirmed, referrals });
    return { userId: r.userId, username: r.username, tierRank: r.tierRank, confirmed: r.confirmed, referrals, xp, badge: signalBadge(xp) };
  }

  /** A single user's reputation (null if they've never verified). */
  repFor(userId: string, refCount: RefCount): SignalRep | null {
    const r = this.byUser.get(userId);
    return r ? this.toRep(r, refCount) : null;
  }

  /** Top-N by XP, computed with live referral counts. */
  leaderboard(refCount: RefCount, n = 10): SignalRep[] {
    return [...this.byUser.values()]
      .map((r) => this.toRep(r, refCount))
      .sort((a, b) => b.xp - a.xp)
      .slice(0, n);
  }

  size(): number {
    return this.byUser.size;
  }
}

export const proofOfSignal = new ProofOfSignalStore();
