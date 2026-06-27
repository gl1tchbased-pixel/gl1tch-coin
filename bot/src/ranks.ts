/** Numeric holder-gated rank tiers. Mirrors the website's src/lib/ranks.ts
 *  (same ids, names, and thresholds). Kept in sync by a cross-surface test. */

export interface RankTier {
  id: "observer" | "infected" | "bearer" | "core" | "ghost";
  rank: string;
  min: number; // minimum $GL1TCH (UI amount) to reach this tier
  tier: 1 | 2 | 3 | 4 | 5;
  unlocks: string;
}

export const RANK_TIERS: RankTier[] = [
  { id: "observer", rank: "Observer", min: 0, tier: 1, unlocks: "Public archive and rooms" },
  { id: "infected", rank: "Infected", min: 100_000, tier: 2, unlocks: "Holder badge, holder-only channel" },
  { id: "bearer", rank: "Signal Bearer", min: 1_000_000, tier: 3, unlocks: "Creator channel, raid coordination, early lore" },
  { id: "core", rank: "Core Node", min: 5_000_000, tier: 4, unlocks: "Inner strategy room, governance signals" },
  { id: "ghost", rank: "Ghost Node", min: 10_000_000, tier: 5, unlocks: "Top-tier room, direct line to core, exclusive archive" },
];

export function rankForBalance(balance: number): RankTier {
  let current = RANK_TIERS[0];
  for (const tier of RANK_TIERS) {
    if (balance >= tier.min) current = tier;
  }
  return current;
}

/** Tier ids a holder qualifies for, lowest to highest (their tier + everything below). */
export function unlockedTierIds(balance: number): RankTier["id"][] {
  const reached = rankForBalance(balance).tier;
  return RANK_TIERS.filter((t) => t.tier <= reached).map((t) => t.id);
}
