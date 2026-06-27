import { rankForBalance, unlockedTierIds, type RankTier } from "../ranks.js";
import { VerifyStore } from "./store.js";

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
}

export type VerifyResult =
  | { ok: false; error: "invalid_or_expired_nonce" | "bad_signature" | "internal" }
  | {
      ok: true;
      tgUserId: number;
      wallet: string;
      rank: string;
      tierId: RankTier["id"];
      balance: number;
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
    const tier = rankForBalance(balance);

    store.setVerification({
      tgUserId: pending.tgUserId,
      wallet: req.publicKey,
      tierId: tier.id,
      balance,
      verifiedAt: Date.now(),
    });

    const invites = deps.grantAccess
      ? await deps.grantAccess(pending.tgUserId, unlockedTierIds(balance))
      : [];

    return {
      ok: true,
      tgUserId: pending.tgUserId,
      wallet: req.publicKey,
      rank: tier.rank,
      tierId: tier.id,
      balance,
      unlocks: tier.unlocks,
      invites,
      preLaunch: !deps.contractLive,
    };
  } catch {
    return { ok: false, error: "internal" };
  }
}
