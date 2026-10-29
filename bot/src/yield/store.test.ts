import { describe, it, expect } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { YieldStore, type YieldPoint } from "./store.js";

const H = 3_600_000;
const D = 24 * H;
const NOW = Date.UTC(2026, 9, 29, 12, 0, 0);
const tmp = () => path.join(fs.mkdtempSync(path.join(os.tmpdir(), "gl1tch-yield-")), "y.json");
const pt = (t: number, rate = "1.0"): YieldPoint => ({ t, apy: 0.05, tvlUsd: 1e6, rate });

describe("YieldStore", () => {
  it("keeps points in time order", () => {
    const s = new YieldStore(tmp());
    s.append("a", pt(NOW - 2 * H), NOW);
    s.append("a", pt(NOW - 4 * H), NOW);
    s.append("a", pt(NOW), NOW);
    expect(s.history("a").map((p) => p.t)).toEqual([NOW - 4 * H, NOW - 2 * H, NOW]);
    expect(s.firstSeen("a")).toBe(NOW - 4 * H);
    expect(s.firstSeen("missing")).toBeNull();
  });

  it("thins points older than 8 days to the last one of each UTC day, drops > 120 days", () => {
    const s = new YieldStore(tmp());
    const oldDay = Date.UTC(2026, 9, 10); // 19 days before NOW
    s.append("a", pt(oldDay + 1 * H, "1.1"), NOW);
    s.append("a", pt(oldDay + 5 * H, "1.2"), NOW);
    s.append("a", pt(oldDay + 9 * H, "1.3"), NOW);
    s.append("a", pt(NOW - 130 * D), NOW);
    s.append("a", pt(NOW - 2 * H), NOW);
    s.append("a", pt(NOW - 1 * H), NOW);
    const h = s.history("a");
    expect(h.filter((p) => p.t >= oldDay && p.t < oldDay + D).map((p) => p.rate)).toEqual(["1.3"]);
    expect(h.some((p) => p.t === NOW - 130 * D)).toBe(false);
    expect(h.filter((p) => p.t > NOW - 3 * H)).toHaveLength(2); // recent hourly points untouched
  });

  it("finds the nearest point within tolerance, or none", () => {
    const s = new YieldStore(tmp());
    s.append("a", pt(NOW - 7 * D - 2 * H, "1.0"), NOW);
    s.append("a", pt(NOW - 7 * D + 30 * 60_000, "1.1"), NOW);
    expect(s.nearest("a", NOW - 7 * D, 12 * H)?.rate).toBe("1.1");
    expect(s.nearest("a", NOW - 1 * D, 3 * H)).toBeNull();
    expect(s.nearest("nope", NOW, H)).toBeNull();
  });

  it("round-trips through the file", () => {
    const file = tmp();
    const a = new YieldStore(file);
    a.append("x", pt(NOW), NOW);
    a.setSnapshot({ updatedAt: NOW, opportunities: [], sources: [], prices: { ETH: 2000 }, gas: {}, network: { solanaEpochsPerYear: null, solanaInflation: null, solanaStakedShare: null } });
    a.save();
    const b = new YieldStore(file);
    b.load();
    expect(b.history("x")).toHaveLength(1);
    expect(b.snapshot()?.prices.ETH).toBe(2000);
  });

  it("loads a corrupt file as empty", () => {
    const file = tmp();
    fs.writeFileSync(file, "{not json");
    const s = new YieldStore(file);
    expect(() => s.load()).not.toThrow();
    expect(s.snapshot()).toBeNull();
    expect(s.history("x")).toEqual([]);
  });
});
