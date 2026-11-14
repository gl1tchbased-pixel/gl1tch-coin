// Runs with Node's own test runner (no Expo or vitest needed): node --experimental-strip-types --test mobile/src/*.test.ts
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { ScanCheck, ScanResult } from "./scan";
import { addWatch, baselineFrom, mergeBaseline, removeWatch, WATCH_CAP, worsened, type WatchItem } from "./watch-rules.ts";

const expect = (actual: unknown) => ({
  toEqual: (expected: unknown) => assert.deepEqual(actual, expected),
  toBe: (expected: unknown) => assert.equal(actual, expected),
  toMatchObject: (expected: Record<string, unknown>) =>
    assert.deepEqual(Object.fromEntries(Object.keys(expected).map((k) => [k, (actual as Record<string, unknown>)[k]])), expected),
});

const check = (key: string, status: ScanCheck["status"], value = "", label = key): ScanCheck => ({
  key,
  label,
  status,
  value,
  explain: "",
});

const result = (over: Partial<ScanResult> = {}, checks: ScanCheck[] = []): ScanResult => ({
  mint: "Mint111111111111111111111111111111111111111",
  chain: "solana",
  name: "Token",
  symbol: "TKN",
  score: 90,
  confidence: 95,
  verdict: "CLEAN",
  bottomLine: "",
  checks,
  ...over,
});

describe("worsened", () => {
  it("reports a verdict that got worse", () => {
    const prev = baselineFrom(result({ verdict: "CLEAN" }));
    const cur = baselineFrom(result({ verdict: "CAUTION" }));
    expect(worsened(prev, cur)).toEqual(["Verdict CLEAN → CAUTION"]);
  });

  it("stays quiet when the verdict improves", () => {
    const prev = baselineFrom(result({ verdict: "HIGH RISK" }));
    const cur = baselineFrom(result({ verdict: "LOW RISK" }));
    expect(worsened(prev, cur)).toEqual([]);
  });

  it("reports a check that got worse, by its label, and ignores improvements", () => {
    const prev = baselineFrom(result({}, [check("mint_authority", "pass", "REVOKED", "Mint authority"), check("concentration", "warn")]));
    const cur = baselineFrom(result({}, [check("mint_authority", "fail", "ACTIVE", "Mint authority"), check("concentration", "pass")]));
    expect(worsened(prev, cur)).toEqual(["Mint authority: pass → fail"]);
  });

  it("does not alarm on a degraded read (unknown statuses, UNKNOWN verdict)", () => {
    const prev = baselineFrom(result({ verdict: "CLEAN" }, [check("liquidity", "pass")]));
    const cur = baselineFrom(result({ verdict: "UNKNOWN" }, [check("liquidity", "unknown")]));
    expect(worsened(prev, cur)).toEqual([]);
  });

  it("ignores checks the previous scan did not have", () => {
    const prev = baselineFrom(result({}, []));
    const cur = baselineFrom(result({}, [check("dev_holdings", "fail")]));
    expect(worsened(prev, cur)).toEqual([]);
  });

  it("reports an LP lock drop of 20 points or more once, by percent", () => {
    const prev = baselineFrom(result({}, [check("lp_lock", "pass", "100%", "LP locked / burned")]));
    const big = baselineFrom(result({}, [check("lp_lock", "fail", "40%", "LP locked / burned")]));
    const small = baselineFrom(result({}, [check("lp_lock", "pass", "90%", "LP locked / burned")]));
    expect(worsened(prev, big)).toEqual(["LP locked / burned: 100% → 40%"]);
    expect(worsened(prev, small)).toEqual([]);
  });

  it("falls back to the LP status when the percent can't be read", () => {
    const prev = baselineFrom(result({}, [check("lp_lock", "pass", "n/a", "LP locked / burned")]));
    const cur = baselineFrom(result({}, [check("lp_lock", "fail", "n/a", "LP locked / burned")]));
    expect(worsened(prev, cur)).toEqual(["LP locked / burned: pass → fail"]);
  });
});

describe("mergeBaseline", () => {
  it("keeps the last known status and verdict through a degraded read, so a later drop still alerts", () => {
    const first = baselineFrom(result({ verdict: "CLEAN" }, [check("liquidity", "pass")]));
    const degraded = baselineFrom(result({ verdict: "UNKNOWN" }, [check("liquidity", "unknown")]));
    const kept = mergeBaseline(first, degraded);
    expect(kept.verdict).toBe("CLEAN");
    expect(kept.checks.liquidity).toBe("pass");

    const bad = baselineFrom(result({ verdict: "HIGH RISK" }, [check("liquidity", "fail")]));
    expect(worsened(kept, bad)).toEqual(["Verdict CLEAN → HIGH RISK", "liquidity: pass → fail"]);
  });

  it("adopts the new state otherwise (edge-triggered: one alert per change)", () => {
    const first = baselineFrom(result({ verdict: "CLEAN" }, [check("liquidity", "pass")]));
    const bad = baselineFrom(result({ verdict: "CAUTION", score: 55 }, [check("liquidity", "warn")]));
    const next = mergeBaseline(first, bad);
    expect(next).toMatchObject({ verdict: "CAUTION", score: 55, checks: { liquidity: "warn" } });
    expect(worsened(next, bad)).toEqual([]);
  });
});

describe("watchlist", () => {
  const item = (mint: string): WatchItem => ({ ...addWatch([], result({ mint }), 1).list[0] });

  it("adds newest first and refreshes an existing token instead of duplicating it", () => {
    let list = addWatch([], result({ mint: "A".repeat(32) }), 1).list;
    list = addWatch(list, result({ mint: "B".repeat(32) }), 2).list;
    list = addWatch(list, result({ mint: "A".repeat(32), verdict: "CAUTION" }), 3).list;
    expect(list.map((w) => w.mint)).toEqual(["A".repeat(32), "B".repeat(32)]);
    expect(list[0].baseline.verdict).toBe("CAUTION");
  });

  it(`refuses a new token once ${WATCH_CAP} are watched`, () => {
    const full = Array.from({ length: WATCH_CAP }, (_, i) => item(String(i).padStart(32, "x")));
    const out = addWatch(full, result({ mint: "N".repeat(32) }), 5);
    expect(out.full).toBe(true);
    expect(out.list).toBe(full);
  });

  it("removes by chain and mint", () => {
    const list = [item("A".repeat(32)), item("B".repeat(32))];
    expect(removeWatch(list, "solana", "A".repeat(32)).map((w) => w.mint)).toEqual(["B".repeat(32)]);
  });
});
