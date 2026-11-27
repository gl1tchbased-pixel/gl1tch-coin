import { describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { TruthStore } from "./store.js";
import { nextDelay, startTruthMonitor } from "./monitor.js";
import type { EndpointReport, TruthSnapshot } from "./probe.js";

const H = 3_600_000;
const DAY = 24 * H;

function snap(t: number, grade: EndpointReport["grade"], silent = 0): TruthSnapshot {
  const e: EndpointReport = { id: "base:x", chain: "base", provider: "x", url: "https://x", grade, reach: "1d", silentCount: silent, headOk: true, head: 1, headLagSec: 0, latencyMs: 100, probes: {} };
  return { version: 1, startedAt: t - 1000, finishedAt: t, chains: [{ chain: "base", label: "Base", referenceHead: 1, blockTimeSec: 2, probes: [], endpoints: [e] }] };
}

const tmp = () => path.join(fs.mkdtempSync(path.join(os.tmpdir(), "truth-")), "s.json");

describe("TruthStore", () => {
  it("is empty (view null) until the first pass", () => {
    const s = new TruthStore(tmp());
    s.load();
    expect(s.view()).toBeNull();
    expect(s.lastFinishedAt()).toBeNull();
  });

  it("keeps a 7-day record, survives a reload, and prunes after 30 days", () => {
    const file = tmp();
    const s = new TruthStore(file, 6 * H);
    const now = 100 * DAY;
    s.record(snap(now - 40 * DAY, "silent_failure", 2)); // pruned later
    s.record(snap(now - 6 * DAY, "silent_failure", 1));
    s.record(snap(now - 1 * DAY, "trusted"));
    s.record(snap(now, "trusted"));

    const again = new TruthStore(file, 6 * H);
    again.load();
    expect(again.historyOf("base:x")).toHaveLength(3);
    const v = again.view(now)!;
    expect(v.records["base:x"]).toEqual({ runs7d: 3, silentRuns7d: 1, trustedRuns7d: 2, downRuns7d: 0, lastSilentAt: now - 6 * DAY, firstSeenAt: now - 6 * DAY });
    expect(v.nextRunAt).toBe(now + 6 * H);
    expect(v.intervalMs).toBe(6 * H);
  });
});

describe("monitor schedule", () => {
  it("anchors to the last stored pass so restarts don't re-measure", () => {
    expect(nextDelay(null, 6 * H, 1_000)).toBe(90_000);
    expect(nextDelay(10 * H, 6 * H, 11 * H)).toBe(5 * H);
    expect(nextDelay(0, 6 * H, 7 * H)).toBe(90_000);
  });

  it("runs a pass, stores it, and schedules the next one 6 h later", async () => {
    const s = new TruthStore(tmp(), 6 * H);
    const timers: number[] = [];
    let fire: (() => void) | null = null;
    let t = 50 * DAY;
    startTruthMonitor(s, {
      now: () => t,
      run: async () => snap(t, "trusted"),
      setTimer: (fn, ms) => {
        timers.push(ms);
        fire = fn;
      },
    });
    expect(timers).toEqual([90_000]);
    t += 90_000;
    await (fire as unknown as () => Promise<void>)();
    expect(s.lastFinishedAt()).toBe(t);
    expect(timers[1]).toBe(6 * H);
  });
});
