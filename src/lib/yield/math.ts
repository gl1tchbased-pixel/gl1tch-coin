/** Yield X-Ray calculators. Pure, so every number on a card can be re-derived by hand. APYs are fractions. */

/** Gas for approve + deposit + withdraw on an EVM lending market (estimate used by the calculator). */
export const ENTRY_EXIT_GAS = 446_000;

export function projectValue(amount: number, apy: number, days: number): number {
  return amount * Math.pow(1 + apy, days / 365);
}

/** The position's dollar value after `days` with the yield, next to simply holding the same asset. */
export function scenario(o: { amount: number; apy: number; days: number; priceChange: number; stable: boolean }) {
  const price = o.stable ? 1 : 1 + o.priceChange;
  const withYield = projectValue(o.amount, o.apy, o.days) * price;
  const holdOnly = o.amount * price;
  return { start: o.amount, withYield, holdOnly, yieldUsd: withYield - holdOnly };
}

/** Full-range 50/50 pool: loss versus holding when the price ratio of the two tokens changes `ratio`-fold. */
export function impermanentLoss(ratio: number): number {
  return (2 * Math.sqrt(ratio)) / (1 + ratio) - 1;
}

/** Value of `amount` put into a 50/50 full-range pool vs. held, after the price ratio moves `ratio`-fold. */
export function lpVsHold(amount: number, ratio: number): { lp: number; hold: number } {
  return { lp: amount * Math.sqrt(ratio), hold: (amount * (1 + ratio)) / 2 };
}

/** Days of yield needed to pay back a one-off cost; null when the yield never pays it back. */
export function breakEvenDays(costUsd: number, amount: number, apy: number): number | null {
  if (costUsd <= 0) return 0;
  if (!(apy > 0) || !(amount > 0)) return null;
  return costUsd / ((amount * apy) / 365);
}

export function gasCostUsd(gwei: number, nativeUsd: number, gas = ENTRY_EXIT_GAS): number {
  return gas * gwei * 1e-9 * nativeUsd;
}
