import { describe, it, expect } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { collect, type CollectorDeps } from "./collector.js";
import { YieldStore } from "./store.js";
import type { Rpc } from "./rpc.js";
import type { YieldOpportunity } from "./types.js";

const H = 3_600_000;
const D = 24 * H;
const NOW = Date.UTC(2026, 9, 29, 12, 0, 0);
const rpc = {} as Rpc;
const store = () => new YieldStore(path.join(fs.mkdtempSync(path.join(os.tmpdir(), "gl1tch-yc-")), "y.json"));

const row = (over: Partial<YieldOpportunity>): YieldOpportunity => ({
  id: "ethereum-lido-wsteth",
  chain: "ethereum",
  protocol: "lido",
  kind: "liquid-staking",
  symbol: "wstETH",
  asset: { symbol: "ETH", address: "native", decimals: 18 },
  receipt: null,
  stable: false,
  method: "growth",
  apy: null,
  window: null,
  measuredSinceMs: null,
  tvlUsd: 1e9,
  idleShare: null,
  feePct: null,
  rate: "1.001",
  inputs: {},
  verify: { rpc: "", body: "", read: "" },
  stale: false,
  updatedAt: NOW,
  ...over,
});

const deps = (over: Partial<CollectorDeps> = {}): CollectorDeps => ({
  readPrices: async () => ({}),
  readSolanaNetwork: async () => ({ solanaEpochsPerYear: null, solanaInflation: null, solanaStakedShare: null }),
  readGas: async () => ({}),
  readAave: async () => [],
  readSpl: async () => [],
  readRates: async () => [row({})],
  ...over,
});

describe("collect", () => {
  it("uses a 7-day growth window when a point from a week ago exists", async () => {
    const s = store();
    s.append("ethereum-lido-wsteth", { t: NOW - 7 * D, apy: null, tvlUsd: 1e9, rate: "1.0" }, NOW);
    const snap = await collect(rpc, s, NOW, deps());
    const o = snap.opportunities.find((x) => x.id === "ethereum-lido-wsteth")!;
    expect(o.window).toBe("7d");
    expect(o.apy).toBeCloseTo(0.0535, 3);
    expect(o.measuredSinceMs).toBe(NOW - 7 * D);
  });

  it("falls back to 24 hours", async () => {
    const s = store();
    s.append("ethereum-lido-wsteth", { t: NOW - D, apy: null, tvlUsd: 1e9, rate: "1.0" }, NOW);
    const snap = await collect(rpc, s, NOW, deps({ readRates: async () => [row({ rate: "1.0001" })] }));
    const o = snap.opportunities[0];
    expect(o.window).toBe("24h");
    expect(o.apy).toBeCloseTo(Math.pow(1.0001, 365) - 1, 6);
  });

  it("says measuring (null APY) without history, and records the first point", async () => {
    const s = store();
    const snap = await collect(rpc, s, NOW, deps());
    expect(snap.opportunities[0].apy).toBeNull();
    expect(snap.opportunities[0].measuredSinceMs).toBe(NOW);
    expect(s.history("ethereum-lido-wsteth")).toHaveLength(1);
  });

  it("keeps a falling rate negative", async () => {
    const s = store();
    s.append("ethereum-lido-wsteth", { t: NOW - 7 * D, apy: null, tvlUsd: 1e9, rate: "1.0" }, NOW);
    const snap = await collect(rpc, s, NOW, deps({ readRates: async () => [row({ rate: "0.999" })] }));
    expect(snap.opportunities[0].apy).toBeLessThan(0);
  });

  it("carries the last rows of a failed source as stale and reports the failure", async () => {
    const s = store();
    const baseRow = row({ id: "base-aave-v3-usdc", chain: "base", protocol: "aave-v3", kind: "lending", method: "rate", apy: 0.05, window: "live", rate: null });
    await collect(rpc, s, NOW - H, deps({ readAave: async (_r, entry) => (entry.chain === "base" ? [baseRow] : []) }));
    const snap = await collect(rpc, s, NOW, deps({ readAave: async (_r, entry) => { if (entry.chain === "base") throw new Error("timeout"); return []; } }));
    expect(snap.sources.find((x) => x.id === "aave:base")).toMatchObject({ ok: false, error: "timeout" });
    const carried = snap.opportunities.find((x) => x.id === "base-aave-v3-usdc");
    expect(carried?.stale).toBe(true);
    expect(carried?.apy).toBe(0.05);
    expect(s.snapshot()?.updatedAt).toBe(NOW);
  });
});
