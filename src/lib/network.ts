/**
 * Network metrics client — the public traction signal. Pulls the live engine metrics the bot
 * exposes (scan volume, Signal Graph coverage, agents assessed) so the site can show real
 * numbers to investors, partners, and developers. This is the "publish your metrics" move:
 * a serious risk-intelligence project shows its traction.
 */

const BASE = (process.env.SCAN_STATS_URL || "https://gl1tch-bot-production-3f2c.up.railway.app").replace(/\/$/, "");

export interface NetworkMetrics {
  scans: { total: number; flagged: number };
  signalGraph: { deployers: number; flaggedActors: number; serialDeployers: number };
  agents: { registered: number };
  reputations: number;
  at: number;
}

/** Live network metrics. Null on any failure (page degrades gracefully). */
export async function networkMetrics(): Promise<NetworkMetrics | null> {
  try {
    const r = await fetch(`${BASE}/signal/metrics`, { next: { revalidate: 60 }, signal: AbortSignal.timeout(6000) });
    if (!r.ok) return null;
    const d = (await r.json()) as { ok?: boolean } & NetworkMetrics;
    return d?.ok ? d : null;
  } catch {
    return null;
  }
}
