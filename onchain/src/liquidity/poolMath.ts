/** Pure helpers for sizing the initial liquidity pool. No I/O — fully unit-tested.
 *  These are the easy-to-get-wrong bits (raw/UI conversion, opening price). */

/** UI token amount allocated to the public pool, from total supply + a percent. */
export function tokensForLiquidity(totalSupply: number, publicPct: number): number {
  if (publicPct < 0 || publicPct > 100) {
    throw new Error(`publicPct must be 0..100, got ${publicPct}`);
  }
  return (totalSupply * publicPct) / 100;
}

/** Convert a UI amount to base units (bigint), respecting decimals. Floors fractions. */
export function toRaw(uiAmount: number, decimals: number): bigint {
  if (uiAmount < 0) throw new Error("uiAmount must be non-negative");
  if (decimals < 0 || !Number.isInteger(decimals)) {
    throw new Error(`decimals must be a non-negative integer, got ${decimals}`);
  }
  // Use string math to avoid float precision loss on large supplies.
  const [whole, frac = ""] = uiAmount.toString().split(".");
  const fracPadded = (frac + "0".repeat(decimals)).slice(0, decimals);
  return BigInt(whole) * 10n ** BigInt(decimals) + BigInt(fracPadded || "0");
}

/** Opening price of one token, denominated in SOL (solInPool / tokensInPool). */
export function initialPriceInSol(tokenUiAmount: number, solUiAmount: number): number {
  if (tokenUiAmount <= 0) throw new Error("tokenUiAmount must be positive");
  return solUiAmount / tokenUiAmount;
}

/** Fully-diluted valuation in SOL = price/token * total supply. */
export function fdvInSol(
  tokenUiAmount: number,
  solUiAmount: number,
  totalSupply: number
): number {
  return initialPriceInSol(tokenUiAmount, solUiAmount) * totalSupply;
}
