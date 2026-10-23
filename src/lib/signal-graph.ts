/**
 * Signal Graph client (PREMIUM-PLAN-v3, Phase 0). Talks to the bot's /signal endpoints
 * (backed by the Railway volume) — our proprietary cross-scan memory of which deployer
 * shipped which token and how it scored. Observations run after the response; reputation
 * reads use a tight timeout and degrade to null so the scan never blocks on the graph.
 */

import { after } from "next/server";

const BASE = (process.env.SCAN_STATS_URL || "https://bot.gl1tchbased.xyz").replace(/\/$/, "");
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

export interface SignalRep {
  userId: string;
  username: string;
  tierRank: number;
  confirmed: boolean;
  referrals: number;
  xp: number;
  badge: "Dormant" | "Signal" | "Amplifier" | "Beacon" | "Beacon Prime";
}

/** Public Proof-of-Signal leaderboard (top reputations). Empty array on any failure. */
export async function signalLeaderboard(n = 10): Promise<SignalRep[]> {
  try {
    const r = await fetch(`${BASE}/signal/leaderboard?n=${n}`, {
      signal: AbortSignal.timeout(4000),
      next: { revalidate: 60 },
    });
    if (!r.ok) return [];
    const d = (await r.json()) as { ok?: boolean; leaderboard?: SignalRep[] };
    return d.ok && Array.isArray(d.leaderboard) ? d.leaderboard : [];
  } catch {
    return [];
  }
}

/** Record a scan observation so the deployer's track record compounds. Non-blocking (runs via after()). */
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
  after(() =>
    fetch(`${BASE}/signal/observe`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-stats-token": TOKEN },
      body: JSON.stringify({ ...obs, ts: Date.now() }),
      signal: AbortSignal.timeout(4000),
    }).then(
      () => {},
      () => {}
    )
  );
}

export interface GraphHub {
  address: string;
  chain: string;
  level: ReputationLevel;
  flaggedCount: number;
  tokensSeen: number;
  note: string;
  tokens: TokenSighting[];
}
export interface GraphSnapshot {
  deployers: number;
  flaggedActors: number;
  serialDeployers: number;
  hubs: GraphHub[];
  updatedAt: number;
}

/**
 * What the Signal Graph 3D draws: the graph's size plus every flagged deployer with the tokens it
 * really shipped (from /signal/directory + /signal/deployer). Null if the bot can't be reached,
 * so the page shows its designed empty state instead of numbers it doesn't have.
 */
export async function signalGraphSnapshot(maxHubs = 12): Promise<GraphSnapshot | null> {
  const get = async <T,>(path: string): Promise<T | null> => {
    try {
      const r = await fetch(`${BASE}${path}`, { signal: AbortSignal.timeout(4000), next: { revalidate: 600 } });
      return r.ok ? ((await r.json()) as T) : null;
    } catch {
      return null;
    }
  };
  const [metrics, dir] = await Promise.all([
    get<{ ok?: boolean; signalGraph?: { deployers?: number; flaggedActors?: number; serialDeployers?: number } }>("/signal/metrics"),
    get<{ ok?: boolean; flagged?: { address: string; chain: string }[] }>("/signal/directory"),
  ]);
  if (!metrics?.ok || !metrics.signalGraph) return null;
  const flagged = (dir?.flagged ?? []).slice(0, maxHubs);
  const reps = await Promise.all(
    flagged.map((f) =>
      get<{ ok?: boolean; reputation?: DeployerReputation }>(
        `/signal/deployer?${new URLSearchParams({ address: f.address, chain: f.chain }).toString()}`
      )
    )
  );
  const hubs: GraphHub[] = reps.flatMap((r) => {
    const rep = r?.ok ? r.reputation : null;
    if (!rep) return [];
    return [{ address: rep.deployer, chain: rep.chain, level: rep.level, flaggedCount: rep.flaggedCount, tokensSeen: rep.tokensSeen, note: rep.note, tokens: rep.recent ?? [] }];
  });
  const g = metrics.signalGraph;
  return { deployers: g.deployers ?? 0, flaggedActors: g.flaggedActors ?? 0, serialDeployers: g.serialDeployers ?? 0, hubs, updatedAt: Date.now() };
}
