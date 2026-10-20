import { describe, expect, it } from "vitest";
import { poolOwnersFrom, realHolders } from "./holders";

// Shapes taken from RugCheck's report for $GL1TCH (2026-10-20).
const POOL = "9fi2sFnnySPhNwJZPzZwxZT3xQnjPa9dh3EQbVNCstRW";
const DEPLOYER = "H5qbtquJzLVrwYj5opedoQCy9edQQZAtiyPMTMFFaFb4";
const known = {
  "2u3P4L5NdPbSwTGcNV2Xhx43K6QK4F3ez13KrrYsjKAk": { name: "Pump Fun", type: "AMM" },
  [POOL]: { name: "Pump Fun", type: "AMM" },
  "7RzTyh7GUtj2F1RNmVrHhmZzK2pvz2AvqdKRUc58W3Mu": { name: "Printr Stake Pool", type: "LOCKER" },
  [DEPLOYER]: { name: "Creator", type: "CREATOR" },
};
const markets = [{ pubkey: POOL, liquidityAAccount: { owner: POOL }, liquidityBAccount: { owner: POOL } }];

describe("holder concentration excludes the liquidity pool", () => {
  it("collects AMM accounts and market pools, not lockers or the creator", () => {
    const pools = poolOwnersFrom(known, markets);
    expect(pools.has(POOL)).toBe(true);
    expect(pools.has(DEPLOYER)).toBe(false);
    expect(pools.has("7RzTyh7GUtj2F1RNmVrHhmZzK2pvz2AvqdKRUc58W3Mu")).toBe(false);
  });

  it("reads $GL1TCH as pool 96.9% and largest real holder 3.1%", () => {
    const r = realHolders([{ owner: POOL, pct: 96.89 }, { owner: DEPLOYER, pct: 3.11 }, { owner: "x", pct: 0 }], poolOwnersFrom(known, markets));
    expect(r.poolPct).toBeCloseTo(96.89);
    expect(r.topPct).toBeCloseTo(3.11);
    expect(r.top10Pct).toBeCloseTo(3.11);
  });

  it("still flags a whale that isn't a pool", () => {
    const r = realHolders([{ owner: "whale", pct: 46 }, { owner: POOL, pct: 40 }], poolOwnersFrom(known, markets));
    expect(r.topPct).toBe(46);
  });

  it("reports nothing without holder data, and 0 when only pools are listed", () => {
    expect(realHolders([], new Set()).topPct).toBeNull();
    expect(realHolders([{ owner: POOL, pct: 99 }], new Set([POOL])).topPct).toBe(0);
  });
});
