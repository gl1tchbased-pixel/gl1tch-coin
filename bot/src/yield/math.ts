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

/**
 * Fee APR of a full-range liquidity position, from a concentrated-liquidity pool's cumulative fee counters
 * (Orca `fee_growth_global_*`, Q64.64 · Uniswap v3 `feeGrowthGlobal*X128`, Q128.128). A full-range position is
 * always in range, so it earns exactly the global growth per unit of liquidity. Its value is `2·L·s` in token1
 * (s = √price), so fees ÷ value = (Δf0·s² + Δf1) ÷ (2s). Counters wrap by design; differences are modular.
 * Not compounded: LP fees accrue to the position and are claimed, not reinvested.
 */
export function feeApr(
  prev: { t: number; fee0: bigint; fee1: bigint },
  cur: { t: number; fee0: bigint; fee1: bigint; sqrtPrice: bigint },
  q: { fee: 64 | 128; sqrt: 64 | 96 }
): number | null {
  if (!(cur.t > prev.t) || cur.sqrtPrice <= 0n) return null;
  const mod = 1n << (q.fee === 64 ? 128n : 256n);
  const delta = (a: bigint, b: bigint) => (((b - a) % mod) + mod) % mod;
  const scale = 2 ** q.fee;
  const d0 = Number(delta(prev.fee0, cur.fee0)) / scale;
  const d1 = Number(delta(prev.fee1, cur.fee1)) / scale;
  const s = Number(cur.sqrtPrice) / 2 ** q.sqrt;
  return ((d0 * s * s + d1) / (2 * s)) * (YEAR_MS / (cur.t - prev.t));
}

/**
 * Pool-average fee APR: fees earned by all in-range liquidity ÷ everything in the pool — the number DEX sites show.
 * Fees in token1 raw units ≈ (Δf0·s² + Δf1) × L, with L averaged over the window (active liquidity moves);
 * pool value = amount0·s² + amount1 (raw vault balances). Concentrated LPs in range earn more than this, a
 * full-range LP far less (feeApr).
 */
export function poolFeeApr(
  prev: { t: number; fee0: bigint; fee1: bigint; liquidity: bigint },
  cur: { t: number; fee0: bigint; fee1: bigint; sqrtPrice: bigint; liquidity: bigint; amount0: bigint; amount1: bigint },
  q: { fee: 64 | 128; sqrt: 64 | 96 }
): number | null {
  if (!(cur.t > prev.t) || cur.sqrtPrice <= 0n) return null;
  const mod = 1n << (q.fee === 64 ? 128n : 256n);
  const delta = (a: bigint, b: bigint) => (((b - a) % mod) + mod) % mod;
  const scale = 2 ** q.fee;
  const d0 = Number(delta(prev.fee0, cur.fee0)) / scale;
  const d1 = Number(delta(prev.fee1, cur.fee1)) / scale;
  const s = Number(cur.sqrtPrice) / 2 ** q.sqrt;
  const l = (Number(prev.liquidity) + Number(cur.liquidity)) / 2;
  const value = Number(cur.amount0) * s * s + Number(cur.amount1);
  if (!(value > 0)) return null;
  return (((d0 * s * s + d1) * l) / value) * (YEAR_MS / (cur.t - prev.t));
}
