/**
 * Yield math for Yield X-Ray. APYs are fractions (0.0457 = 4.57%). Every function here is pure so the
 * numbers on the site can be re-derived from the raw on-chain inputs the card shows.
 */

export const YEAR_MS = 365 * 86_400_000;
const SECONDS_PER_YEAR = 31_536_000;

/** Aave v3 `currentLiquidityRate` (ray = 1e27, a per-year APR) compounded per second, as Aave's UI does. */
export function rayAprToApy(ray: bigint): number {
  const apr = Number(ray) / 1e27;
  return Math.pow(1 + apr / SECONDS_PER_YEAR, SECONDS_PER_YEAR) - 1;
}

/** Annualized compounding growth of an exchange rate between two observations. A falling rate stays negative. */
export function growthApy(r0: number, t0: number, r1: number, t1: number): number | null {
  if (!(r0 > 0) || !(r1 > 0) || !(t1 > t0)) return null;
  return Math.pow(r1 / r0, YEAR_MS / (t1 - t0)) - 1;
}

/** One epoch of stake-pool rate growth, compounded over a year of epochs. */
export function epochApy(rateNow: number, ratePrev: number, epochsPerYearN: number): number | null {
  if (!(rateNow > 0) || !(ratePrev > 0) || !(epochsPerYearN > 0)) return null;
  return Math.pow(rateNow / ratePrev, epochsPerYearN) - 1;
}

/** How many Solana epochs fit in a year at the measured slot speed. */
export function epochsPerYear(slotsInEpoch: number, slotsPerSecond: number): number | null {
  if (!(slotsInEpoch > 0) || !(slotsPerSecond > 0)) return null;
  return (365 * 86_400 * slotsPerSecond) / slotsInEpoch;
}
