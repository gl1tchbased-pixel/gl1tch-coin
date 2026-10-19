/**
 * Freshness of a CURBy quantum pulse. CURBy publishes a round every few minutes when it is
 * running; a round older than a day means the source has paused, so the site must say
 * "last round · date" instead of "live". Dependency-free, safe on client and server.
 */
export const CURBY_STALE_MS = 24 * 60 * 60 * 1000;

/** True when the pulse timestamp is missing, unparseable, or older than CURBY_STALE_MS. */
export function isPulseStale(timestamp: string | undefined, now: number = Date.now()): boolean {
  const ts = Date.parse(timestamp ?? "");
  if (!Number.isFinite(ts)) return true;
  return now - ts > CURBY_STALE_MS;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "22 Aug 2025" (UTC) for labels, "unknown date" if the timestamp can't be read. */
export function formatPulseDate(timestamp: string): string {
  const d = new Date(timestamp);
  if (!Number.isFinite(d.getTime())) return "unknown date";
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}
