import { randomBytes } from "node:crypto";
import type { RankTier } from "../ranks.js";

export interface PendingNonce {
  nonce: string;
  tgUserId: number;
  tgUsername?: string;
  createdAt: number;
}

export interface Verification {
  tgUserId: number;
  wallet: string;
  tierId: RankTier["id"];
  balance: number; // current on-chain balance at verification time
  sustainedBalance?: number | null; // 7-day time-weighted average (anti-gaming), if tracked
  provisional?: boolean; // true until a full 7-day window confirms sustained holding
  verifiedAt: number;
}

export interface StoreOptions {
  ttlMs?: number; // nonce lifetime
  now?: () => number; // injectable clock for tests
}

const DEFAULT_TTL = 10 * 60_000; // 10 minutes

/** In-memory nonce + verification store. One nonce is single-use and expires. */
export class VerifyStore {
  private nonces = new Map<string, PendingNonce>();
  private verifications = new Map<number, Verification>();
  private ttlMs: number;
  private now: () => number;

  constructor(opts: StoreOptions = {}) {
    this.ttlMs = opts.ttlMs ?? DEFAULT_TTL;
    this.now = opts.now ?? Date.now;
  }

  /** Issue a fresh single-use nonce bound to a Telegram user. */
  issueNonce(tgUserId: number, tgUsername?: string): string {
    const nonce = randomBytes(16).toString("hex");
    this.nonces.set(nonce, { nonce, tgUserId, tgUsername, createdAt: this.now() });
    return nonce;
  }

  /** Consume a nonce: returns the record and removes it, or null if missing/expired. */
  consumeNonce(nonce: string): PendingNonce | null {
    const rec = this.nonces.get(nonce);
    if (!rec) return null;
    this.nonces.delete(nonce);
    if (this.now() - rec.createdAt > this.ttlMs) return null;
    return rec;
  }

  /** Drop expired nonces (housekeeping). */
  pruneNonces(): void {
    const cutoff = this.now() - this.ttlMs;
    for (const [k, v] of this.nonces) if (v.createdAt < cutoff) this.nonces.delete(k);
  }

  setVerification(v: Verification): void {
    this.verifications.set(v.tgUserId, v);
  }

  getVerification(tgUserId: number): Verification | undefined {
    return this.verifications.get(tgUserId);
  }

  /** Serialize verifications for JSON persistence. */
  exportVerifications(): Verification[] {
    return [...this.verifications.values()];
  }

  importVerifications(list: Verification[]): void {
    for (const v of list) this.verifications.set(v.tgUserId, v);
  }
}
