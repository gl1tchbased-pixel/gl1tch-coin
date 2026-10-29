/** Token amount conversions for Safe Swap, exact (BigInt, no floats). Shared by the API and the widget. */

/** A decimal amount ("0.25") in the token's smallest unit. Null when it isn't a positive number, or
 *  has more fraction digits than the token has decimals. */
export function toAtomic(ui: string, decimals: number): string | null {
  const s = ui.trim();
  const m = /^(\d{1,15})(?:\.(\d+))?$/.exec(s);
  if (!m || !Number.isInteger(decimals) || decimals < 0 || decimals > 18) return null;
  const frac = m[2] ?? "";
  if (frac.length > decimals) return null;
  const atomic = BigInt(m[1] + frac.padEnd(decimals, "0"));
  return atomic > BigInt(0) ? atomic.toString() : null;
}

/** Smallest units back to a decimal string, trailing zeros trimmed. */
export function fromAtomic(atomic: string, decimals: number): string {
  if (!/^\d+$/.test(atomic)) return "0";
  const padded = atomic.padStart(decimals + 1, "0");
  const whole = padded.slice(0, padded.length - decimals).replace(/^0+(?=\d)/, "");
  const frac = decimals ? padded.slice(-decimals).replace(/0+$/, "") : "";
  return frac ? `${whole}.${frac}` : whole;
}
