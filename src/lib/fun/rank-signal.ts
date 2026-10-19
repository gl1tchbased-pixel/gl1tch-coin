// The connected wallet's tier, shared from RankChecker (which reads the balance) to the 3D rank
// coins, which may mount before or after it.
export const RANK_EVENT = "gl1tch:rank";
let last: number | null = null;

/** Tier index (0 = Observer … 4 = Ghost Node), or null when no wallet is read. */
export function publishRank(index: number | null) {
  if (index === last) return;
  last = index;
  window.dispatchEvent(new CustomEvent(RANK_EVENT, { detail: index }));
}
export const currentRank = () => last;
