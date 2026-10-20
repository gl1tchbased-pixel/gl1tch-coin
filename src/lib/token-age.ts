import type { CheckStatus, Verdict } from "./scan";

/**
 * Token age. A token minted minutes ago can pass every structural check (authorities revoked, no
 * insiders yet) and still be a rug in an hour: most rugs happen in the first hours. So a token under
 * 24 hours old gets a warning row and can never read CLEAN. `ageDays` is whole days since the pair was
 * created (floored), so 0 means "under 24 hours".
 */
export interface AgeRead {
  status: CheckStatus;
  value: string;
  explain: string;
}

export function tokenAgeCheck(ageDays: number | null): AgeRead {
  if (ageDays == null || !Number.isFinite(ageDays) || ageDays < 0) {
    return { status: "unknown", value: "—", explain: "Couldn't read when trading started, so the token's age is unknown." };
  }
  if (ageDays < 1) {
    return {
      status: "warn",
      value: "< 24 hours",
      explain: "Trading started less than a day ago. There's no track record yet, and most rugs happen in the first hours. Treat any clean read as provisional.",
    };
  }
  const shown = ageDays === 1 ? "1 day" : `${ageDays} days`;
  return {
    status: "pass",
    value: shown,
    explain: ageDays < 7
      ? `Trading for ${shown}: past the riskiest first hours, but still young.`
      : `Trading for ${shown}.`,
  };
}

/**
 * A token under 24 hours old, or one with no readable trading history at all (no DEX pair yet), can be
 * LOW RISK at best, never CLEAN. Verified blue-chips are re-cast later by applyVerified, so they're unaffected.
 */
export function capVerdictForAge(verdict: Verdict, ageDays: number | null): Verdict {
  const unproven = ageDays == null || !Number.isFinite(ageDays) || ageDays < 1;
  return verdict === "CLEAN" && unproven ? "LOW RISK" : verdict;
}
