/**
 * Quantum Core bridge client (site → bot). Reads the durable draw + Beacon state
 * the bot hosts on its Railway volume, and forwards signed draw entries. Mirrors
 * the Signal Graph client pattern: timeouts + graceful degradation to null/[].
 */

const BASE = (process.env.SCAN_STATS_URL || "https://gl1tch-bot-production-3f2c.up.railway.app").replace(/\/$/, "");

export type DrawStatus = "open" | "committed" | "revealed" | "void";

export interface DrawPulse {
  round: number;
  index: number;
  valueHex: string;
  cid: string;
  timestamp: string;
}

export interface Draw {
  id: string;
  type: string;
  openedAt: number;
  closesAt: number;
  status: DrawStatus;
  participants: string[];
  merkleRoot?: string;
  targetAfterIndex?: number;
  committedAt?: number;
  pulse?: DrawPulse;
  winnerIndex?: number;
  winner?: string;
  revealedAt?: number;
  note?: string;
}

export interface BeaconEntry {
  at: number;
  drawId: string;
  event: DrawStatus | "opened";
  detail: Record<string, unknown>;
  seq?: number;
  prevHash?: string;
  hash?: string;
}

/** The exact message a wallet signs to enter — MUST match bot/src/quantum-core/enter.ts. */
export function drawEntryMessage(address: string, drawId: string, issuedMs: number): string {
  return `GL1TCH Quantum Draw Entry\nWallet: ${address}\nDraw: ${drawId}\nIssued: ${issuedMs}\nThis enters you into a provably-fair draw. It moves no funds and grants no access.`;
}

async function getJson<T>(path: string, revalidate = 15): Promise<T | null> {
  try {
    const r = await fetch(`${BASE}${path}`, { next: { revalidate }, signal: AbortSignal.timeout(6000) });
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch {
    return null;
  }
}

export async function currentDraw(): Promise<Draw | null> {
  const d = await getJson<{ ok?: boolean; draw?: Draw | null }>("/quantum/draw/current");
  return d?.ok ? d.draw ?? null : null;
}

export async function drawStatus(id: string): Promise<Draw | null> {
  const d = await getJson<{ ok?: boolean; draw?: Draw | null }>(`/quantum/draw/status?id=${encodeURIComponent(id)}`);
  return d?.ok ? d.draw ?? null : null;
}

export async function beaconLog(limit = 50): Promise<BeaconEntry[]> {
  const d = await getJson<{ ok?: boolean; beacon?: BeaconEntry[] }>(`/quantum/beacon?limit=${limit}`);
  return d?.ok ? d.beacon ?? [] : [];
}

/** Forward a wallet-signed entry to the bot (called server-side by the API route). */
export async function forwardEntry(body: {
  address: string;
  drawId: string;
  issued: number;
  signature: string;
}): Promise<{ ok: boolean; error?: string; count?: number }> {
  try {
    const r = await fetch(`${BASE}/quantum/draw/enter`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(6000),
    });
    return (await r.json()) as { ok: boolean; error?: string; count?: number };
  } catch {
    return { ok: false, error: "unreachable" };
  }
}
