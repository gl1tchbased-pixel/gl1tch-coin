/**
 * Freshness for live cards. A card is stale once its data is older than twice its expected
 * refresh interval; stale cards drop the green "live" dot and say how old they are.
 */
export function isStale(updatedAt: number | undefined, intervalMs: number, now: number = Date.now()): boolean {
  if (typeof updatedAt !== "number" || !Number.isFinite(updatedAt)) return true;
  return now - updatedAt > 2 * intervalMs;
}

/** "just now" · "5 min ago" · "3 h ago" · "3 d ago". */
export function ageLabel(updatedAt: number, now: number = Date.now()): string {
  const s = Math.max(0, (now - updatedAt) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  return `${Math.round(s / 86400)} d ago`;
}
