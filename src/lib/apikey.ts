/**
 * API-key client. A $GL1TCH holder mints a rate-tiered API key by signing (proving wallet
 * ownership); the bot verifies a sustained balance and issues the key. The key then unlocks
 * higher programmatic/bulk API throughput — the free human scanner stays free. This is the
 * token's REQUIRED utility: depth/rate demand becomes token demand. Non-custodial.
 */

const BASE = (process.env.SCAN_STATS_URL || "https://gl1tch-bot-production-3f2c.up.railway.app").replace(/\/$/, "");

/** The exact message a wallet signs to mint a key — MUST match bot/src/api-keys/keys.ts. */
export function apiKeyMessage(address: string, issuedMs: number): string {
  return `GL1TCH API Key\nWallet: ${address}\nIssued: ${issuedMs}\nThis proves wallet ownership to issue a rate-limited API key. It moves no funds and grants no access to your wallet.`;
}

export interface IssuedKey {
  ok: boolean;
  error?: string;
  key?: string;
  tier?: number;
  tierId?: string;
  ratePerMin?: number;
}

/** Forward a signed key-issue request to the bot (called server-side by the API route). */
export async function forwardIssueKey(body: { address: string; issued: number; signature: string }): Promise<IssuedKey> {
  try {
    const r = await fetch(`${BASE}/keys/issue`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    });
    return (await r.json()) as IssuedKey;
  } catch {
    return { ok: false, error: "unreachable" };
  }
}

interface KeyInfo { tier: number; tierId: string; ratePerMin: number }
const cache = new Map<string, { info: KeyInfo | null; at: number }>();
const TTL = 60_000;

/** Validate an API key → its tier/rate. Cached per instance. Null if unknown/invalid. */
export async function checkApiKey(key: string): Promise<KeyInfo | null> {
  if (!key || !/^gk_[0-9a-f]{40}$/.test(key)) return null;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.info;
  try {
    const r = await fetch(`${BASE}/keys/check?key=${encodeURIComponent(key)}`, { signal: AbortSignal.timeout(4000), cache: "no-store" });
    const d = (await r.json()) as { ok?: boolean; tier?: number; tierId?: string; ratePerMin?: number };
    const info = d?.ok && typeof d.ratePerMin === "number" ? { tier: d.tier!, tierId: d.tierId!, ratePerMin: d.ratePerMin } : null;
    cache.set(key, { info, at: Date.now() });
    return info;
  } catch {
    return null;
  }
}
