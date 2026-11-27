import { describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { HOUR, outcomeOf, pickSample, ratesOf, wilson, type Candle, type Outcome } from "./outcome.js";
import { EVAL_AFTER_MS, RealityStore, weekStart } from "./store.js";
import { addressFromGtId, runCycle, type GtGet } from "./sampler.js";

const T0 = Date.UTC(2026, 10, 20, 12); // a Friday
const c = (h: number, close: number, low = close): Candle => [T0 + h * HOUR, close, close, low, close];
const tmp = () => path.join(fs.mkdtempSync(path.join(os.tmpdir(), "reality-")), "r.json");

describe("outcomeOf", () => {
  it("measures from the price one hour in to three days after that", () => {
    const o = outcomeOf([c(0.25, 1), c(0.9, 2), c(10, 1.5, 0.4), c(73, 0.5), c(80, 9)], T0);
    expect(o).toEqual({ kind: "traded", p1h: 2, p72: 0.5, change72: -0.75, maxDrawdown: -0.8, candlesAfter: 2 });
  });

  it("calls a token with no trade after the first hour 'stopped'", () => {
    expect(outcomeOf([c(0.1, 1), c(0.5, 0.01)], T0)).toEqual({ kind: "stopped_first_hour", tradedFirstHour: true });
  });

  it("measures a token that only started trading later from its first price", () => {
    const o = outcomeOf([[T0 + 5 * HOUR, 3, 3, 3, 3.3], c(40, 6)], T0);
    expect(o).toMatchObject({ kind: "traded", p1h: 3, change72: 1 });
  });

  it("returns no_data without candles and ignores zero prices", () => {
    expect(outcomeOf([], T0)).toEqual({ kind: "no_data" });
    expect(outcomeOf([c(2, 0)], T0)).toEqual({ kind: "no_data" });
  });
});

describe("ratesOf / wilson / pickSample", () => {
  it("computes shares of all launches and of those still trading", () => {
    const os: Outcome[] = [
      { kind: "stopped_first_hour", tradedFirstHour: true },
      { kind: "stopped_first_hour", tradedFirstHour: false },
      { kind: "traded", p1h: 1, p72: 0.05, change72: -0.95, maxDrawdown: -0.95, candlesAfter: 9 },
      { kind: "traded", p1h: 1, p72: 0.4, change72: -0.6, maxDrawdown: -0.7, candlesAfter: 9 },
      { kind: "traded", p1h: 1, p72: 1.2, change72: 0.2, maxDrawdown: -0.1, candlesAfter: 9 },
      { kind: "no_data" },
    ];
    const r = ratesOf(os);
    expect(r).toMatchObject({ n: 5, stoppedFirstHour: 2, traded: 3, halved: 2, wiped: 1, upOrFlat: 1, medianChange72: -0.6 });
    expect(r.stoppedShare).toBeCloseTo(0.4);
    expect(r.halvedShare).toBeCloseTo(2 / 3);
    expect(r.lostHalfOrMoreShare).toBeCloseTo(0.8);
    expect(r.lostHalfOrMoreCi![0]).toBeLessThan(0.8);
    expect(r.lostHalfOrMoreCi![1]).toBeGreaterThan(0.8);
  });

  it("handles empty input", () => {
    expect(ratesOf([])).toMatchObject({ n: 0, halvedShare: null, medianChange72: null, lostHalfOrMoreCi: null });
    expect(wilson(0, 0)).toBeNull();
  });

  it("samples deterministically", () => {
    const xs = Array.from({ length: 20 }, (_, i) => i);
    expect(pickSample(xs, 4, 99)).toEqual(pickSample(xs, 4, 99));
    expect(new Set(pickSample(xs, 4, 99)).size).toBe(4);
    expect(pickSample([1, 2], 5, 1).sort()).toEqual([1, 2]);
  });
});

describe("GeckoTerminal ids", () => {
  it("strips the full network prefix, even when it contains an underscore", () => {
    expect(addressFromGtId("polygon_pos_0xabc", "polygon_pos")).toBe("0xabc");
    expect(addressFromGtId("solana_Mint111", "solana")).toBe("Mint111");
    expect(addressFromGtId("eth_0xabc", "base")).toBeNull();
    expect(addressFromGtId(undefined, "eth")).toBeNull();
  });
});

describe("runCycle against a fake GeckoTerminal", () => {
  const now = T0 + 10 * 24 * HOUR;
  const iso = (t: number) => new Date(t).toISOString();
  function fakeGt(): { gt: GtGet; calls: string[] } {
    const calls: string[] = [];
    const gt: GtGet = async (p) => {
      calls.push(p);
      if (p.startsWith("/networks/base/new_pools")) {
        return {
          data: [
            { attributes: { address: "0xpoolnew1", pool_created_at: iso(now - 10 * 60_000) }, relationships: { base_token: { data: { id: "base_0xnew1" } }, dex: { data: { id: "uniswap-v4-base" } } } },
            { attributes: { address: "0xpoolnew2", pool_created_at: iso(now - 20 * 60_000) }, relationships: { base_token: { data: { id: "base_0xnew2" } }, dex: { data: { id: "uniswap-v2-base" } } } },
            { attributes: { address: "0xpoolold", pool_created_at: iso(now - 5 * 60_000) }, relationships: { base_token: { data: { id: "base_0xpepe" } }, dex: { data: { id: "uniswap-v4-base" } } } },
            { attributes: { address: "0xpoolweth", pool_created_at: iso(now - 5 * 60_000) }, relationships: { base_token: { data: { id: "base_0x4200000000000000000000000000000000000006" } }, dex: { data: { id: "x" } } } },
            { attributes: { address: "0xpoolstale", pool_created_at: iso(now - 9 * HOUR) }, relationships: { base_token: { data: { id: "base_0xstale" } }, dex: { data: { id: "x" } } } },
          ],
        };
      }
      const tok = p.match(/tokens\/(0x\w+)\/pools/);
      if (tok) {
        const created = tok[1] === "0xpepe" ? now - 300 * 24 * HOUR : tok[1] === "0xnew1" ? now - 10 * 60_000 : now - 20 * 60_000;
        return { data: [{ attributes: { pool_created_at: iso(created) } }] };
      }
      if (p.includes("/pools/0xdue/ohlcv")) {
        const created = T0;
        return { data: { attributes: { ohlcv_list: [[(created + 0.5 * HOUR) / 1000, 1, 1, 1, 1], [(created + 30 * HOUR) / 1000, 1, 1, 0.2, 0.3]] } } };
      }
      if (p.includes("/pools/0xgone/ohlcv")) return { notFound: true };
      if (p.includes("/pools/0xflaky/ohlcv")) return null;
      return { data: [] };
    };
    return { gt, calls };
  }

  it("samples only brand-new tokens, measures due ones, and never re-samples a pool", async () => {
    const store = new RealityStore(tmp());
    store.add({ chain: "base", pool: "0xdue", token: "0xd", dex: "uniswap-v2-base", createdAt: T0, sampledAt: T0 });
    store.add({ chain: "base", pool: "0xgone", token: "0xg", dex: "uniswap-v2-base", createdAt: T0, sampledAt: T0 });
    store.add({ chain: "base", pool: "0xflaky", token: "0xf", dex: "uniswap-v2-base", createdAt: T0, sampledAt: T0 });
    store.add({ chain: "base", pool: "0xyoung", token: "0xy", dex: "uniswap-v2-base", createdAt: now - HOUR, sampledAt: now - HOUR });
    const { gt, calls } = fakeGt();
    const r = await runCycle(store, gt, { now: () => now, chains: ["base"] });
    expect(r).toEqual({ sampled: { base: 2 }, rejectedOld: 1, evaluated: 2, failed: 1 });
    const pools = store.all().map((t) => t.pool).sort();
    expect(pools).toEqual(["0xdue", "0xflaky", "0xgone", "0xpoolnew1", "0xpoolnew2", "0xyoung"]);
    const due = store.all().find((t) => t.pool === "0xdue")!;
    expect(due.outcome).toMatchObject({ kind: "traded", change72: -0.7 });
    expect(store.all().find((t) => t.pool === "0xgone")!.outcome).toEqual({ kind: "no_data" });
    expect(store.all().find((t) => t.pool === "0xflaky")!.attempts).toBe(1);
    expect(calls.some((p) => p.includes("0x4200000000000000000000000000000000000006"))).toBe(false); // WETH never checked

    const again = await runCycle(store, gt, { now: () => now + 60_000, chains: ["base"] });
    expect(again.sampled.base).toBe(0); // all three fresh pools already seen
  });
});

describe("RealityStore view", () => {
  it("reports the last 7 closed windows, all-time rates, dex and weekly breakdowns, and survives reload", () => {
    const file = tmp();
    const s = new RealityStore(file);
    const now = T0 + 20 * 24 * HOUR;
    const mk = (i: number, createdAt: number, outcome: Outcome, dex = "pump-fun") => {
      s.add({ chain: "solana", pool: `p${i}`, token: `t${i}`, dex, createdAt, sampledAt: createdAt });
      s.setOutcome("solana", `p${i}`, outcome, createdAt + EVAL_AFTER_MS);
    };
    const halved: Outcome = { kind: "traded", p1h: 1, p72: 0.3, change72: -0.7, maxDrawdown: -0.8, candlesAfter: 5 };
    const fine: Outcome = { kind: "traded", p1h: 1, p72: 1.1, change72: 0.1, maxDrawdown: -0.2, candlesAfter: 5 };
    mk(1, now - 4 * 24 * HOUR, halved);
    mk(2, now - 5 * 24 * HOUR, { kind: "stopped_first_hour", tradedFirstHour: true });
    mk(3, now - 6 * 24 * HOUR, fine, "pumpswap");
    mk(4, now - 15 * 24 * HOUR, halved); // older than this week's window
    s.add({ chain: "solana", pool: "p5", token: "t5", dex: "pump-fun", createdAt: now - HOUR, sampledAt: now - HOUR }); // awaiting
    s.save();

    const r = new RealityStore(file);
    r.load();
    const v = r.view(now);
    const sol = v.chains.find((c) => c.chain === "solana")!;
    expect(sol.week.n).toBe(3);
    expect(sol.week.lostHalfOrMoreShare).toBeCloseTo(2 / 3);
    expect(sol.all.n).toBe(4);
    expect(sol.sampled).toBe(5);
    expect(sol.awaiting).toBe(1);
    expect(sol.byDex[0]).toMatchObject({ dex: "pump-fun", n: 3 });
    expect(sol.weekly.reduce((a, w) => a + w.n, 0)).toBe(4);
    expect(v.minSample).toBe(30);
    expect(v.chains.find((c) => c.chain === "base")).toMatchObject({ sampled: 0, firstResultAt: null });
  });

  it("weeks start on Monday UTC", () => {
    expect(new Date(weekStart(T0)).toISOString()).toBe("2026-11-16T00:00:00.000Z");
  });
});
