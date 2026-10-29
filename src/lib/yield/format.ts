/** Display formatting for Yield X-Ray. Unknown values render as an em dash, never as 0. */

export function pct(x: number | null | undefined, digits = 2): string {
  if (x == null || !Number.isFinite(x)) return "—";
  return `${(x * 100).toFixed(digits)}%`;
}

export function usd(x: number | null | undefined): string {
  if (x == null || !Number.isFinite(x)) return "—";
  if (x >= 1e9) return `$${(x / 1e9).toFixed(2)}B`;
  if (x >= 1e6) return `$${(x / 1e6).toFixed(1)}M`;
  if (x >= 1e3) return `$${(x / 1e3).toFixed(1)}K`;
  return `$${x.toFixed(2)}`;
}

/** Exact dollars for calculator results ("$1,049.05"), where compact K/M rounding would hide the yield. */
export function money(x: number | null | undefined): string {
  if (x == null || !Number.isFinite(x)) return "—";
  const s = Math.abs(x).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${x < 0 ? "-" : ""}$${s}`;
}

export function ago(ms: number, now: number = Date.now()): string {
  const s = Math.max(0, now - ms) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86_400) return `${Math.floor(s / 3600)} h ago`;
  const d = Math.floor(s / 86_400);
  return `${d} day${d === 1 ? "" : "s"} ago`;
}
