import { describe, it, expect } from "vitest";
import { parseGeckoOhlcv, stepSeries } from "./ohlcv";

describe("parseGeckoOhlcv", () => {
  it("reads [ts, o, h, l, c, v] rows into ascending candles (ms)", () => {
    const rows = [[1760832000, 1, 1, 1, 3, 9], [1760745600, 1, 1, 1, 2, 4]];
    expect(parseGeckoOhlcv(rows)).toEqual([
      { t: 1760745600000, c: 2, v: 4 },
      { t: 1760832000000, c: 3, v: 9 },
    ]);
  });
  it("drops malformed rows and survives junk input", () => {
    expect(parseGeckoOhlcv([[1, 2], "x", [1760745600, 1, 1, 1, "n/a", 1]])).toEqual([]);
    expect(parseGeckoOhlcv(null)).toEqual([]);
  });
});

describe("stepSeries (price holds flat between real trades)", () => {
  const c = [{ t: 100, c: 1, v: 1 }, { t: 300, c: 2, v: 1 }, { t: 500, c: 3, v: 1 }];
  it("carries the last close before the window to its start, and the last close to its end", () => {
    expect(stepSeries(c, 200, 600)).toEqual([
      { t: 200, c: 1, traded: false },
      { t: 300, c: 2, traded: true },
      { t: 500, c: 3, traded: true },
      { t: 600, c: 3, traded: false },
    ]);
  });
  it("is empty when nothing ever traded up to the window end", () => {
    expect(stepSeries(c, 0, 50)).toEqual([]);
  });
  it("shows a flat line when the window holds no trades", () => {
    expect(stepSeries(c, 600, 900)).toEqual([
      { t: 600, c: 3, traded: false },
      { t: 900, c: 3, traded: false },
    ]);
  });
});
