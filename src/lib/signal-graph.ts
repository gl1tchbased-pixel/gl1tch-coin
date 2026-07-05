/**
 * Signal Graph client (PREMIUM-PLAN-v3, Phase 0). Talks to the bot's /signal endpoints
 * (backed by the Railway volume) — our proprietary cross-scan memory of which deployer
 * shipped which token and how it scored. Observations are fire-and-forget; reputation
 * reads use a tight timeout and degrade to null so the scan never blocks on the graph.
 */

const BASE = (process.env.SCAN_STATS_URL || "https://gl1tch-bot-production-3f2c.up.railway.app").replace(/\/$/, "");
const TOKEN = process.env.STATS_TOKEN || "";

export type ReputationLevel = "unknown" | "clean" | "watch" | "serial";

export interface TokenSighting {
  mint: string;
  verdict: string;
  score: number | null;
  name?: string | null;
  symbol?: string | null;
  ts: number;
}

export interface DeployerReputation {
  deployer: string;
  chain: string;
  tokensSeen: number;
  flaggedCount: number;
  worstScore: number | null;
  level: ReputationLevel;
  note: string;
  recent: TokenSighting[];
}

/** A deployer's track record from the graph, excluding the token being scanned. Null on any failure. */
export async function deployerReputation(
  address: string,
  chain: string,
  excludeMint?: string
): Promise<DeployerReputation | null> {
  try {
    const qs = new URLSearchParams({ address, chain });
    if (excludeMint) qs.set("exclude", excludeMint);
    const r = await fetch(`${BASE}/signal/deployer?${qs.toString()}`, {
      signal: AbortSignal.timeout(2500),
      next: { revalidate: 30 },
    });
    if (!r.ok) return null;
    const d = (await r.json()) as { ok?: boolean; reputation?: DeployerReputation };
    return d.ok && d.reputation ? d.reputation : null;
  } catch {
    return null;
  }
}

/** Record a scan observation so the deployer's track record compounds. Fire-and-forget. */
export function observeDeployer(obs: {
  deployer: string;
  chain: string;
  mint: string;
  verdict: string;
  score: number | null;
  name?: string | null;
  symbol?: string | null;
}): void {
  if (!TOKEN || !obs.deployer) return;
  void fetch(`${BASE}/signal/observe`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-stats-token": TOKEN },
    body: JSON.stringify({ ...obs, ts: Date.now() }),
    signal: AbortSignal.timeout(4000),
  }).catch(() => {});
}
