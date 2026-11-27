import { runTruthPass, type TruthSnapshot } from "./probe.js";
import type { TruthStore } from "./store.js";

/**
 * Runs a measurement pass every `store.intervalMs` (6 h). The bot restarts on every deploy (the updater pulls
 * main every 5 minutes), so the schedule is anchored to the last stored pass, never to process start: a restart
 * waits out the remaining time instead of hitting every endpoint again.
 */
export function nextDelay(lastFinishedAt: number | null, intervalMs: number, now: number, minDelayMs = 90_000): number {
  if (lastFinishedAt == null) return minDelayMs;
  return Math.max(minDelayMs, lastFinishedAt + intervalMs - now);
}

export function startTruthMonitor(
  store: TruthStore,
  opts: { run?: () => Promise<TruthSnapshot>; now?: () => number; setTimer?: (fn: () => void, ms: number) => unknown } = {}
): void {
  const run = opts.run ?? (() => runTruthPass());
  const now = opts.now ?? Date.now;
  const setTimer = opts.setTimer ?? ((fn, ms) => setTimeout(fn, ms).unref?.());
  let running = false;

  const tick = async () => {
    if (running) return;
    running = true;
    try {
      const snap = await run();
      store.record(snap);
      const n = snap.chains.reduce((a, c) => a + c.endpoints.length, 0);
      const silent = snap.chains.reduce((a, c) => a + c.endpoints.filter((e) => e.grade === "silent_failure").length, 0);
      console.log(`[rpc-truth] pass done in ${Math.round((snap.finishedAt - snap.startedAt) / 1000)}s: ${n} endpoints, ${silent} with silent failures`);
    } catch (e) {
      console.error("[rpc-truth] pass failed:", (e as Error).message);
    } finally {
      running = false;
      setTimer(tick, nextDelay(store.lastFinishedAt(), store.intervalMs, now()));
    }
  };

  const delay = nextDelay(store.lastFinishedAt(), store.intervalMs, now());
  console.log(`[rpc-truth] next pass in ${Math.round(delay / 60_000)} min`);
  setTimer(tick, delay);
}
