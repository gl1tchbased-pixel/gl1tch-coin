import { OFFICIAL } from "../../content.js";
import { statsStore } from "../../stats.js";
import { attestStore } from "../../attest/store.js";

/** Live inputs for the post composer: what the product actually did lately. Every number is read, never invented. */

export interface RadarCatch {
  chain: string;
  mint: string;
  name: string;
  symbol: string;
  verdict: string;
  score: number;
  reason: string;
  flagged: boolean;
}

export interface Signals {
  /** The latest Rug Radar sweep; null when the site couldn't be reached. */
  radar: { scanned: number; flagged: number; caught: RadarCatch[] } | null;
  /** Scans run by people since `splitSince` (automated sweeps excluded); null before the split. */
  userScans: number | null;
  splitSince: number | null;
  /** Radar sweeps recorded for anchoring (A3), and how many of them are sealed on-chain. */
  recordedSweeps: number;
  sealedSweeps: number;
}

function isCatch(x: unknown): x is RadarCatch {
  const c = x as Partial<RadarCatch> | null;
  return (
    !!c &&
    typeof c.chain === "string" &&
    typeof c.mint === "string" &&
    typeof c.verdict === "string" &&
    typeof c.score === "number" &&
    typeof c.reason === "string"
  );
}

export async function readSignals(): Promise<Signals> {
  let radar: Signals["radar"] = null;
  try {
    const r = await fetch(`${OFFICIAL.SITE.replace(/\/$/, "")}/api/radar`, { signal: AbortSignal.timeout(20_000) });
    if (r.ok) {
      const j = (await r.json()) as { scanned?: unknown; flagged?: unknown; caught?: unknown };
      if (typeof j.scanned === "number" && Array.isArray(j.caught)) {
        radar = {
          scanned: j.scanned,
          flagged: typeof j.flagged === "number" ? j.flagged : 0,
          caught: j.caught.filter(isCatch).map((c) => ({ ...c, name: c.name ?? "", symbol: c.symbol ?? "", flagged: !!c.flagged })),
        };
      }
    }
  } catch {
    // radar unreachable: the composer falls back to formats that need no live data
  }
  const s = statsStore.get();
  const a = attestStore.summary();
  return {
    radar,
    userScans: s.splitSince ? s.user : null,
    splitSince: s.splitSince,
    recordedSweeps: a.sweeps,
    sealedSweeps: a.sealed,
  };
}
