import { clientIp } from "./ratelimit";

/** Header the GL1TCH Android app sends on scans a person starts by hand. */
export const APP_CLIENT_HEADER = "x-gl1tch-client";
export const APP_CLIENT_VALUE = "gl1tch-android";

/**
 * Who triggered a scan, for the public people-vs-automation counter (/api/stats). Strict on purpose: a scan
 * counts as a person's only when it plainly came from one of our own front ends.
 *  - our website: browsers add `Sec-Fetch-Site: same-origin` themselves (page scripts can't set it), with a
 *    browser user agent;
 *  - our Android app: manual scans carry `x-gl1tch-client: gl1tch-android` (background re-checks are tagged
 *    `x-gl1tch-source` and stay automated).
 * Everything else, including scripts calling /api/scan directly, is automation. Until 28 Nov 2026 those direct
 * calls were counted as people (one script on a hosting provider's network made ~7,000 of them in four days).
 */
export function scanKind(req: Request, mint: string, ownContract: string): "user" | "auto" {
  const h = req.headers;
  if (mint === ownContract || h.has("x-gl1tch-source")) return "auto";
  if (h.get(APP_CLIENT_HEADER) === APP_CLIENT_VALUE) return "user";
  if (h.get("sec-fetch-site") === "same-origin" && /^Mozilla\/5\.0 /.test(h.get("user-agent") ?? "")) return "user";
  return "auto";
}

/**
 * One log line describing where a counted "person's scan" came from, so a jump in the public `user`
 * counter (/api/stats) can be explained before anyone quotes it. Only coarse data: the IP is cut to its
 * network part, the referrer to its host, and the user agent to 120 printable characters.
 */
export function describeScanSource(req: Request, mint: string): string {
  const h = req.headers;
  const clean = (s: string | null, max: number) => (s ?? "").replace(/[^\x20-\x7e]/g, "").slice(0, max) || "-";
  let ref = "-";
  try {
    const r = h.get("referer");
    if (r) ref = new URL(r).host || "-";
  } catch {
    ref = "invalid";
  }
  return [
    `mint=${mint.slice(0, 6)}…${mint.slice(-4)}`,
    `net=${maskIp(clientIp(req))}`,
    `country=${clean(h.get("cf-ipcountry"), 2)}`,
    `ref=${clean(ref, 80)}`,
    `ua=${JSON.stringify(clean(h.get("user-agent"), 120))}`,
  ].join(" ");
}

/** 203.0.113.7 → 203.0.x.x; 2001:db8:1::5 → 2001:db8:…; anything else → "?". */
export function maskIp(ip: string): string {
  const v4 = ip.match(/^(\d{1,3})\.(\d{1,3})\.\d{1,3}\.\d{1,3}$/);
  if (v4) return `${v4[1]}.${v4[2]}.x.x`;
  if (ip.includes(":")) {
    const parts = ip.split(":").filter(Boolean).slice(0, 2);
    return parts.length ? `${parts.join(":")}:…` : "?";
  }
  return "?";
}
