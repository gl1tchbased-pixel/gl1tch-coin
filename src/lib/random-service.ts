/**
 * Quantum-Randomness client (server-side forward). A $GL1TCH holder's API key gates
 * access; the site forwards the request to the bot, which commits it to a future drand
 * round and later reveals + proves it. Keeping the forward server-side keeps the bot
 * CORS-clean and lets the site rate-limit by the key's tier (same model as /api/scan).
 */

const BASE = (process.env.SCAN_STATS_URL || "https://gl1tch-bot-production-3f2c.up.railway.app").replace(/\/$/, "");

/** Forward a randomness request (the caller's API key gates it on the bot too). */
export async function forwardRandomRequest(key: string, spec: unknown, salt: unknown): Promise<{ status: number; body: unknown }> {
  try {
    const r = await fetch(`${BASE}/random/request`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-gl1tch-key": key },
      body: JSON.stringify({ spec, salt }),
      signal: AbortSignal.timeout(9000),
    });
    return { status: r.status, body: await r.json() };
  } catch {
    return { status: 503, body: { ok: false, error: "unreachable" } };
  }
}

/** Fetch a request's status/result (public — reveals on target-round maturity). */
export async function fetchRandomResult(id: string): Promise<{ status: number; body: unknown }> {
  try {
    const r = await fetch(`${BASE}/random/get?id=${encodeURIComponent(id)}`, {
      signal: AbortSignal.timeout(9000),
      cache: "no-store",
    });
    return { status: r.status, body: await r.json() };
  } catch {
    return { status: 503, body: { ok: false, error: "unreachable" } };
  }
}

/** Public tamper-evident event log (commitments + reveals). */
export async function fetchRandomLog(limit = 30): Promise<unknown[]> {
  try {
    const r = await fetch(`${BASE}/random/log?limit=${limit}`, { signal: AbortSignal.timeout(6000), cache: "no-store" });
    const d = (await r.json()) as { ok?: boolean; log?: unknown[] };
    return d?.ok && Array.isArray(d.log) ? d.log : [];
  } catch {
    return [];
  }
}
