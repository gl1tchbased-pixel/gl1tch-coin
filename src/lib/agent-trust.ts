/**
 * Agent Trust Layer client — the GL1TCH pivot to the AI-agent economy. Asks the bot (which
 * holds the agent registry + Signal Graph) for an agent wallet's trust assessment.
 */

const BASE = (process.env.SCAN_STATS_URL || "https://gl1tch-bot-production-3f2c.up.railway.app").replace(/\/$/, "");

export type TrustLevel = "unknown" | "caution" | "neutral" | "trusted";

export interface AgentAssessment {
  address: string;
  chain: string;
  score: number;
  level: TrustLevel;
  reasons: string[];
  registered: boolean;
  verified: boolean;
}

/** The exact message an agent signs to register (must match the bot's agentRegMessage). */
export function agentRegMessage(address: string, issuedMs: number): string {
  return `GL1TCH Agent Registration\nWallet: ${address}\nIssued: ${issuedMs}\nThis proves wallet ownership. It moves no funds and grants no access.`;
}

export interface RegisterInput {
  address: string;
  chain?: string;
  issued: number;
  signature: string; // base58 ed25519 over agentRegMessage(address, issued)
  label?: string;
}

/** Forward a signed agent registration to the bot. Returns {ok, error?}. */
export async function registerAgent(input: RegisterInput): Promise<{ ok: boolean; error?: string }> {
  try {
    const r = await fetch(`${BASE}/signal/agent/register`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chain: "solana", ...input }),
      signal: AbortSignal.timeout(6000),
    });
    const d = (await r.json()) as { ok?: boolean; error?: string };
    return { ok: !!d.ok, error: d.error };
  } catch {
    return { ok: false, error: "unreachable" };
  }
}

/** Trust assessment for an agent wallet. Null on any failure. */
export async function agentCheck(address: string, chain = "solana"): Promise<AgentAssessment | null> {
  try {
    const qs = new URLSearchParams({ address, chain });
    const r = await fetch(`${BASE}/signal/agent?${qs.toString()}`, {
      signal: AbortSignal.timeout(6000),
      next: { revalidate: 30 },
    });
    if (!r.ok) return null;
    const d = (await r.json()) as { ok?: boolean; agent?: AgentAssessment };
    return d.ok && d.agent ? d.agent : null;
  } catch {
    return null;
  }
}
