import { describe, it, expect, beforeEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { RevenueStore, parseRevenueEntry, type RevenueEntry } from "./revenue.js";

const TX_A = "5".repeat(88);
const TX_B = "4".repeat(87);
const SOL = "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp";

function entry(over: Partial<RevenueEntry> = {}): RevenueEntry {
  return { tx: TX_A, network: SOL, route: "scan", amountMicro: 10_000, payer: "Payer111", self: false, at: Date.UTC(2026, 9, 28, 12), ...over };
}

let file: string;
let store: RevenueStore;
beforeEach(() => {
  file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "gl1tch-rev-")), "revenue.json");
  store = new RevenueStore(file);
  store.load();
});

describe("RevenueStore", () => {
  it("totals paid entries in micro-USDC", () => {
    store.record(entry());
    store.record(entry({ tx: TX_B, route: "deployer", amountMicro: 5_000 }));
    const s = store.summary();
    expect(s.paid).toEqual({ count: 2, usdMicro: 15_000 });
    expect(s.byRoute).toEqual({ scan: { count: 1, usdMicro: 10_000 }, deployer: { count: 1, usdMicro: 5_000 } });
    expect(s.byNetwork[SOL]).toEqual({ count: 2, usdMicro: 15_000 });
    expect(s.since).toBe(Date.UTC(2026, 9, 28, 12));
  });

  it("counts the same settlement once", () => {
    expect(store.record(entry())).toBe("added");
    expect(store.record(entry())).toBe("duplicate");
    expect(store.summary().paid).toEqual({ count: 1, usdMicro: 10_000 });
  });

  it("keeps self-test payments out of revenue but lists them, flagged", () => {
    store.record(entry({ self: true }));
    const s = store.summary();
    expect(s.paid).toEqual({ count: 0, usdMicro: 0 });
    expect(s.self).toEqual({ count: 1, usdMicro: 10_000 });
    expect(s.byRoute).toEqual({});
    expect(s.daily).toEqual({});
    expect(s.recent).toHaveLength(1);
    expect(s.recent[0].self).toBe(true);
  });

  it("buckets days in UTC", () => {
    store.record(entry({ at: Date.UTC(2026, 9, 28, 23, 59) }));
    expect(Object.keys(store.summary().daily)).toEqual(["2026-10-28"]);
  });

  it("serves the newest 50 first", () => {
    for (let i = 0; i < 60; i++) store.record(entry({ tx: `${i}`.padStart(64, "1"), at: 1_000 + i }));
    const recent = store.summary().recent;
    expect(recent).toHaveLength(50);
    expect(recent[0].at).toBe(1_059);
  });

  it("persists each payment immediately (a restart right after a payment loses nothing)", () => {
    store.record(entry());
    const fresh = new RevenueStore(file);
    fresh.load();
    expect(fresh.summary().paid).toEqual({ count: 1, usdMicro: 10_000 });
  });

  it("keeps a corrupt ledger file aside instead of overwriting it with an empty one", () => {
    fs.writeFileSync(file, "{not json");
    const s = new RevenueStore(file);
    s.load();
    s.record(entry());
    const dir = path.dirname(file);
    const kept = fs.readdirSync(dir).filter((f) => f.startsWith("revenue.json.corrupt-"));
    expect(kept).toHaveLength(1);
    expect(fs.readFileSync(path.join(dir, kept[0]), "utf8")).toBe("{not json");
  });

  it("survives a restart, duplicates included", () => {
    store.record(entry());
    store.flush();
    const again = new RevenueStore(file);
    again.load();
    expect(again.summary().paid).toEqual({ count: 1, usdMicro: 10_000 });
    expect(again.record(entry())).toBe("duplicate");
  });
});

describe("parseRevenueEntry", () => {
  const good = { tx: TX_A, network: SOL, route: "scan", amountMicro: 10_000, payer: "Payer111", self: false, at: 5 };

  it("accepts a well-formed entry", () => {
    expect(parseRevenueEntry(good)).toEqual(good);
    expect(parseRevenueEntry({ ...good, tx: "0x" + "a".repeat(64), network: "eip155:8453" })?.network).toBe("eip155:8453");
  });

  it("defaults `at` to now and `self` to false", () => {
    const e = parseRevenueEntry({ tx: TX_A, network: SOL, route: "agent", amountMicro: 1 });
    expect(e?.self).toBe(false);
    expect(typeof e?.at).toBe("number");
  });

  it.each([
    ["fractional amount", { amountMicro: 0.5 }],
    ["negative amount", { amountMicro: -1 }],
    ["string amount", { amountMicro: "10000" }],
    ["zero amount", { amountMicro: 0 }],
    ["huge amount", { amountMicro: 2e9 }],
    ["unknown route", { route: "x" }],
    ["short tx", { tx: "abc" }],
    ["bad network", { network: "bitcoin" }],
    ["long payer", { payer: "p".repeat(65) }],
  ])("rejects %s", (_name, patch) => {
    expect(parseRevenueEntry({ ...good, ...patch })).toBeNull();
  });

  it("rejects non-objects", () => {
    expect(parseRevenueEntry(null)).toBeNull();
    expect(parseRevenueEntry("x")).toBeNull();
  });
});
