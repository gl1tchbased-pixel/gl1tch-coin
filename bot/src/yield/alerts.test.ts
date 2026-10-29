import { describe, it, expect } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { yieldAlertChanges, nextBaseline, sendYieldAlerts } from "./alerts.js";
import { YieldWatchStore, YIELD_WATCH_CAP, type YieldBaseline } from "./watch-store.js";
import type { YieldOpportunity, YieldSnapshot } from "./types.js";

const opp = (over: Partial<YieldOpportunity> = {}): YieldOpportunity => ({
  id: "base-aave-v3-usdc", chain: "base", protocol: "aave-v3", kind: "lending", symbol: "USDC",
  asset: { symbol: "USDC", address: "0x", decimals: 6 }, receipt: null, stable: true, ilRisk: "none", tokens: [],
  method: "rate", apy: 0.05, window: "live", measuredSinceMs: null, tvlUsd: 100e6, idleShare: 0.1, feePct: null,
  rate: null, inputs: {}, verify: { rpc: "", body: "", read: "" }, stale: false, updatedAt: 0, ...over,
});
const base = (over: Partial<YieldBaseline> = {}): YieldBaseline => ({ apy: 0.05, tvlUsd: 100e6, idleShare: 0.1, ...over });
const tmp = () => path.join(fs.mkdtempSync(path.join(os.tmpdir(), "gl1tch-yw-")), "w.json");

describe("yieldAlertChanges", () => {
  it("flags an APY that fell to half or less", () => {
    expect(yieldAlertChanges(base(), opp({ apy: 0.024 }))[0]).toMatch(/APY fell from 5\.00% to 2\.40%/);
    expect(yieldAlertChanges(base(), opp({ apy: 0.03 }))).toEqual([]);
  });

  it("ignores tiny yields moving around", () => {
    expect(yieldAlertChanges(base({ apy: 0.004 }), opp({ apy: 0.001 }))).toEqual([]);
  });

  it("flags a negative reading, a 30% deposit drop and a withdrawal squeeze", () => {
    expect(yieldAlertChanges(base(), opp({ apy: -0.01 })).join(" ")).toMatch(/went down/);
    expect(yieldAlertChanges(base(), opp({ tvlUsd: 65e6 })).join(" ")).toMatch(/Deposits fell 35%/);
    expect(yieldAlertChanges(base(), opp({ idleShare: 0.01 })).join(" ")).toMatch(/1\.0% of deposits can be withdrawn/);
  });

  it("stays quiet while measuring or stale", () => {
    expect(yieldAlertChanges(base(), opp({ apy: null }))).toEqual([]);
    expect(yieldAlertChanges(base(), opp({ apy: 0.001, stale: true }))).toEqual([]);
  });
});

describe("nextBaseline", () => {
  it("keeps the high-water mark so a slow slide still triggers, and resets after an alert", () => {
    let b = base();
    for (const apy of [0.045, 0.04, 0.035, 0.03]) {
      expect(yieldAlertChanges(b, opp({ apy }))).toEqual([]);
      b = nextBaseline(b, opp({ apy }), false);
    }
    expect(b.apy).toBe(0.05);
    expect(yieldAlertChanges(b, opp({ apy: 0.024 })).length).toBe(1);
    b = nextBaseline(b, opp({ apy: 0.024 }), true);
    expect(b.apy).toBe(0.024);
    expect(yieldAlertChanges(b, opp({ apy: 0.024 }))).toEqual([]);
  });

  it("adopts the first measured value", () => {
    expect(nextBaseline({ apy: null, tvlUsd: null, idleShare: null }, opp({ apy: 0.03 }), false).apy).toBe(0.03);
  });
});

describe("YieldWatchStore", () => {
  it("adds, refuses duplicates and the 26th watch, removes, persists", () => {
    const file = tmp();
    const s = new YieldWatchStore(file);
    expect(s.add({ userId: 1, chatId: 1, id: "a", baseline: base() }, 0)).toBe("added");
    expect(s.add({ userId: 1, chatId: 1, id: "a", baseline: base() }, 0)).toBe("exists");
    for (let i = 1; i < YIELD_WATCH_CAP; i++) s.add({ userId: 1, chatId: 1, id: `x${i}`, baseline: base() }, 0);
    expect(s.add({ userId: 1, chatId: 1, id: "overflow", baseline: base() }, 0)).toBe("cap");
    expect(s.remove(1, "a")).toBe(true);
    expect(s.remove(1, "a")).toBe(false);
    const t = new YieldWatchStore(file);
    t.load();
    expect(t.forUser(1)).toHaveLength(YIELD_WATCH_CAP - 1);
  });
});

describe("sendYieldAlerts", () => {
  it("messages the watcher once per change and updates the baseline", async () => {
    const s = new YieldWatchStore(tmp());
    s.add({ userId: 7, chatId: 70, id: "base-aave-v3-usdc", baseline: base() }, 0);
    const sent: { chat: number; text: string }[] = [];
    const bot = { api: { sendMessage: async (chat: number, text: string) => { sent.push({ chat, text }); return {}; } } };
    const snap = { opportunities: [opp({ apy: 0.02 })] } as YieldSnapshot;
    expect(await sendYieldAlerts(bot, snap, s)).toBe(1);
    expect(sent[0].chat).toBe(70);
    expect(sent[0].text).toContain("https://gl1tchbased.xyz/yield/base-aave-v3-usdc");
    expect(await sendYieldAlerts(bot, snap, s)).toBe(0);
  });
});
