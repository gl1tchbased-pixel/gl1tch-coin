import { latestPulse } from "./curby.js";
import { quantumCore } from "./store.js";
import { openDraw, freezeCommit, revealDraw, drawIdForPeriod, type Draw } from "./logic.js";

/**
 * Quantum Draw executor — the scheduled, server-side, externally-untriggerable task
 * that drives the commit-reveal lifecycle (spec §12, §14.4). No HTTP request can
 * run a draw; only this tick can. It is idempotent and safe to run on an interval.
 *
 * Per tick: ensure an open draw exists for the current period → freeze+commit a
 * closed window (targeting a FUTURE CURBy round) → reveal a committed draw once a
 * later finalized pulse exists. On CURBy failure it DEFERS (never downgrades).
 */

const WINDOW_MS = Math.max(60_000, Number(process.env.QUANTUM_DRAW_WINDOW_MS) || 7 * 24 * 60 * 60 * 1000);
const TICK_MS = Math.max(60_000, (Number(process.env.QUANTUM_TICK_MINUTES) || 5) * 60_000);
const DRAW_TYPE = "weekly";

export async function tickQuantumCore(now = Date.now()): Promise<void> {
  quantumCore.load();
  let current = quantumCore.current();

  // Open the first-ever draw, or roll into a new period once the last one is terminal.
  const periodId = drawIdForPeriod(now, WINDOW_MS);
  if (!current || ((current.status === "revealed" || current.status === "void") && current.id !== periodId)) {
    const opened = openDraw(periodId, DRAW_TYPE, now, WINDOW_MS);
    quantumCore.upsert(opened.draw);
    quantumCore.logBeacon(opened.beacon);
    current = opened.draw;
  }

  // Freeze / reveal need a CURBy read; fetch once.
  if (current.status === "open" && now >= current.closesAt) {
    const pulse = await latestPulse();
    if (!pulse) return; // no index to target → defer, retry next tick
    const t = freezeCommit(current, now, pulse.index);
    if (t) {
      quantumCore.upsert(t.draw);
      quantumCore.logBeacon(t.beacon);
      current = t.draw;
    }
  }

  if (current.status === "committed") {
    const pulse = await latestPulse();
    if (!pulse || !pulse.verified) return; // defer — no verified pulse yet
    const t = revealDraw(current, { round: pulse.round, index: pulse.index, valueHex: pulse.valueHex, cid: pulse.cid, timestamp: pulse.timestamp }, now);
    if (t) {
      quantumCore.upsert(t.draw);
      quantumCore.logBeacon(t.beacon);
    }
  }
}

/** Start the recurring executor. Runs once immediately, then every TICK_MS. */
export function startQuantumCore(): void {
  const run = () =>
    tickQuantumCore().catch((e) => console.warn("[quantum] tick failed:", (e as Error).message));
  run();
  setInterval(run, TICK_MS).unref?.();
  console.log(`[quantum] executor started (window ${Math.round(WINDOW_MS / 3600000)}h, tick ${Math.round(TICK_MS / 60000)}m)`);
}

/** Read model for the site bridge. */
export function currentDrawView(): Draw | null {
  quantumCore.load();
  return quantumCore.current() ?? null;
}
