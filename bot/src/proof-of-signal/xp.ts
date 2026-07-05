/**
 * Proof-of-Signal v0 (PREMIUM-PLAN-v3, Phase 0) — pure reputation logic.
 *
 * A user's Signal Reputation fuses the hardest-to-fake signals they've produced:
 *   • verified *sustained* holding (already anti-gamed by the 7-day balance check), and
 *   • community they've brought in (verified referrals),
 *   • (reserved) distinct tokens they've contributed to the graph.
 * No paid rewards — status only. Pure + unit-tested; persistence lives in ./store.ts.
 */

export interface SignalInputs {
  verifiedTierRank: number; // 0 = not verified, 1..5 = tier reached (sustained)
  confirmed: boolean; // sustained tier confirmed (not provisional) → worth more
  referrals: number; // verified referrals brought in
  distinctScans?: number; // reserved for v0.1 (scan attribution) — 0 for now
}

export const SCAN_CAP = 40; // bound scan XP so submission spam can't farm reputation
const XP_PER_TIER_CONFIRMED = 120;
const XP_PER_TIER_PROVISIONAL = 60; // half until sustained holding is proven
const XP_PER_REFERRAL = 25;
const XP_PER_SCAN = 5;

/** Total Signal-Reputation XP from a user's verifiable inputs. Deterministic. */
export function computeXp(i: SignalInputs): number {
  const tier = Math.max(0, Math.min(5, Math.floor(i.verifiedTierRank)));
  const holder = tier * (i.confirmed ? XP_PER_TIER_CONFIRMED : XP_PER_TIER_PROVISIONAL);
  const refs = Math.max(0, i.referrals) * XP_PER_REFERRAL;
  const scans = Math.min(Math.max(0, i.distinctScans ?? 0), SCAN_CAP) * XP_PER_SCAN;
  return holder + refs + scans;
}

export type SignalBadge = "Dormant" | "Signal" | "Amplifier" | "Beacon" | "Beacon Prime";

const BADGES: { min: number; badge: SignalBadge }[] = [
  { min: 1200, badge: "Beacon Prime" },
  { min: 600, badge: "Beacon" },
  { min: 250, badge: "Amplifier" },
  { min: 50, badge: "Signal" },
  { min: 0, badge: "Dormant" },
];

/** Reputation badge for an XP total (highest threshold met). */
export function signalBadge(xp: number): SignalBadge {
  for (const b of BADGES) if (xp >= b.min) return b.badge;
  return "Dormant";
}
