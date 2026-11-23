import { clientIp } from "./ratelimit";

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
