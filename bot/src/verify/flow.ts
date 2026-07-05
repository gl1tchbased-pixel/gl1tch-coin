import { rankForBalance, unlockedTierIds, type RankTier } from "../ranks.js";
import { VerifyStore } from "./store.js";
import { sustainedBalance, effectiveBalance, type BalanceSnapshot } from "./sustained.js";

export interface VerifyRequest {
  nonce: string;
  publicKey: string;
  signature: string;
}

export interface VerifyDeps {
  /** Returns true if the signature over the nonce message is valid for publicKey. */
  verify: (nonce: string, publicKey: string, signature: string) => boolean;
  /** Reads the wallet's $GL1TCH balance. Only called once the token is live. */
  readBalance: (owner: string) => Promise<number>;
  /** True once a contract address exists (token launched). */
  contractLive: boolean;
  /** Optional: grant access for the unlocked tiers; returns invite links to DM. */
  grantAccess?: (tgUserId: number, tierIds: RankTier["id"][]) => Promise<string[]>;
  /** Optional anti-gaming layer: records the balance snapshot and returns the wallet's
   *  history so the tier can be gated on a 7-day sustained average (see ./sustained.ts).
   *  When absent, the tier rides on the current balance (legacy behaviour). */
  recordHistory?: (wallet: string, balance: number) => BalanceSnapshot[];
}

export type VerifyResult =
  | { ok: false; error: "invalid_or_expired_nonce" | "bad_signature" | "internal" }
  | {
      ok: true;
      tgUserId: number;
      wallet: string;
      rank: string;
      tierId: RankTier["id"];
      balance: number; // current on-chain balance (what we display)
      sustainedBalance: number | null; // 7-day time-weighted average (null if not tracked)
      provisional: boolean; // true until a full 7-day window of history confirms the tier
      coverageDays: number; // days of held-balance history backing this tier
      unlocks: string;
      invites: string[];
      preLaunch: boolean;
    };

/** Orchestrates one verification: nonce → signature → balance → tier → access grant.
 *  All side-effecting work is injected so the logic is unit-testable. */
export async function handleVerification(
  store: VerifyStore,
  deps: VerifyDeps,
  req: VerifyRequest
): Promise<VerifyResult> {
  const pending = store.consumeNonce(req.nonce);
  if (!pending) return { ok: false, error: "invalid_or_expired_nonce" };

  if (!deps.verify(req.nonce, req.publicKey, req.signature)) {
    return { ok: false, error: "bad_signature" };
  }

  try {
    const balance = deps.contractLive ? await deps.readBalance(req.publicKey) : 0;

    // Anti-gaming: gate the tier on a 7-day sustained average when history is tracked, so
    // a balance flashed for one block can't unlock a tier. Falls back to current balance
    // (provisional) until a full window accrues, and pre-launch (no history recorded).
    let sustainedAvg: number | null = null;
    let provisional = false;
    let coverageDays = 0;
    let gating = balance;
    if (deps.recordHistory && deps.contractLive) {
      const snaps = deps.recordHistory(req.publicKey, balance);
      const s = sustainedBalance(snaps, Date.now());
      sustainedAvg = s.average;
      provisional = !s.confirmed;
      coverageDays = s.coverageMs / (24 * 60 * 60 * 1000);
      gating = effectiveBalance(balance, s);
    }

    const tier = rankForBalance(gating);

    store.setVerification({
      tgUserId: pending.tgUserId,
      wallet: req.publicKey,
      tierId: tier.id,
      balance,
      sustainedBalance: sustainedAvg,
      provisional,
      verifiedAt: Date.now(),
    });

    const invites = deps.grantAccess
      ? await deps.grantAccess(pending.tgUserId, unlockedTierIds(gating))
      : [];

    return {
      ok: true,
      tgUserId: pending.tgUserId,
      wallet: req.publicKey,
      rank: tier.rank,
      tierId: tier.id,
      balance,
      sustainedBalance: sustainedAvg,
      provisional,
      coverageDays,
      unlocks: tier.unlocks,
      invites,
      preLaunch: !deps.contractLive,
    };
  } catch {
    return { ok: false, error: "internal" };
  }
}
