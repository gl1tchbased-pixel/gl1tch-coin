import { describe, it, expect } from "vitest";
import {
  recordSnapshot,
  sustainedBalance,
  effectiveBalance,
  SUSTAINED_WINDOW_MS,
  type BalanceSnapshot,
} from "./sustained.js";

const DAY = 24 * 60 * 60 * 1000;
const NOW = 1_000 * DAY; // fixed clock (Date.now() unavailable / avoided for determinism)

describe("recordSnapshot", () => {
  it("appends, sorts, and prunes samples outside the retention window", () => {
    const old = NOW - (SUSTAINED_WINDOW_MS + 5 * DAY); // beyond keep window
    const snaps: BalanceSnapshot[] = [{ ts: old, balance: 9 }];
    const next = recordSnapshot(snaps, 100, NOW);
    expect(next).toEqual([{ ts: NOW, balance: 100 }]); // stale sample dropped
  });

  it("keeps samples within the window", () => {
    const recent = NOW - 2 * DAY;
    const next = recordSnapshot([{ ts: recent, balance: 50 }], 100, NOW);
    expect(next).toHaveLength(2);
    expect(next[0].ts).toBeLessThan(next[1].ts); // sorted ascending
  });
});

describe("sustainedBalance", () => {
  it("returns zero, uncovered for an empty history", () => {
    expect(sustainedBalance([], NOW)).toEqual({ average: 0, coverageMs: 0, confirmed: false });
  });

  it("a single fresh snapshot is provisional (no coverage yet)", () => {
    const s = sustainedBalance([{ ts: NOW, balance: 5_000_000 }], NOW);
    expect(s.average).toBe(5_000_000);
    expect(s.coverageMs).toBe(0);
    expect(s.confirmed).toBe(false);
  });

  it("confirms once a full window of steady holding is covered", () => {
    const snaps = [{ ts: NOW - SUSTAINED_WINDOW_MS, balance: 1_000_000 }];
    const s = sustainedBalance(snaps, NOW);
    expect(s.confirmed).toBe(true);
    expect(s.average).toBe(1_000_000); // held flat across the whole window
  });

  it("a brief flash-buy barely moves a 7-day average (anti-gaming)", () => {
    // Held 0 for ~7 days, then spiked to 10M one minute before the check.
    const snaps: BalanceSnapshot[] = [
      { ts: NOW - SUSTAINED_WINDOW_MS, balance: 0 },
      { ts: NOW - 60_000, balance: 10_000_000 },
    ];
    const s = sustainedBalance(snaps, NOW);
    expect(s.confirmed).toBe(true);
    // one minute of 10M over 7 days ≈ 992 average — nowhere near any tier
    expect(s.average).toBeLessThan(2_000);
  });

  it("time-weights a mid-window balance change", () => {
    // 2M for the first ~3.5 days, 4M for the last ~3.5 days → ~3M average
    const half = SUSTAINED_WINDOW_MS / 2;
    const snaps: BalanceSnapshot[] = [
      { ts: NOW - SUSTAINED_WINDOW_MS, balance: 2_000_000 },
      { ts: NOW - half, balance: 4_000_000 },
    ];
    const s = sustainedBalance(snaps, NOW);
    expect(Math.round(s.average)).toBe(3_000_000);
  });
});

describe("effectiveBalance", () => {
  it("uses the current balance while still provisional (never locks out a new holder)", () => {
    const s = { average: 100, coverageMs: DAY, confirmed: false };
    expect(effectiveBalance(5_000_000, s)).toBe(5_000_000);
  });

  it("caps at the sustained average once confirmed (flash-buy gains nothing)", () => {
    const s = { average: 992, coverageMs: SUSTAINED_WINDOW_MS, confirmed: true };
    expect(effectiveBalance(10_000_000, s)).toBe(992);
  });

  it("a recent dump immediately loses perks once confirmed", () => {
    const s = { average: 6_000_000, coverageMs: SUSTAINED_WINDOW_MS, confirmed: true };
    expect(effectiveBalance(0, s)).toBe(0); // min(current=0, avg) → tier drops
  });
});
