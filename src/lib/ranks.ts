/** Holder-gated rank thresholds (UI token amounts). Mirrors whitepaper Section 8. */

export interface RankTier {
  id: string;
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

export function nextTier(current: RankTier): RankTier | null {
  const idx = RANK_TIERS.findIndex((t) => t.id === current.id);
  return idx >= 0 && idx < RANK_TIERS.length - 1 ? RANK_TIERS[idx + 1] : null;
}

export function formatAmount(n: number): string {
  return n.toLocaleString("en-US");
}
