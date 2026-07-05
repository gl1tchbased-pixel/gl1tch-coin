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
