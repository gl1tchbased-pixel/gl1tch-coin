import { describe, it, expect } from "vitest";
import { pct, usd, ago, money } from "./format";

describe("yield formatting", () => {
  it("formats fractions as percentages", () => {
    expect(pct(0.04569)).toBe("4.57%");
    expect(pct(-0.0123)).toBe("-1.23%");
    expect(pct(6.389, 0)).toBe("639%");
    expect(pct(null)).toBe("—");
    expect(pct(Number.NaN)).toBe("—");
  });

  it("formats dollar sizes compactly", () => {
    expect(usd(2_343_400_000)).toBe("$2.34B");
    expect(usd(190_100_000)).toBe("$190.1M");
    expect(usd(62_360)).toBe("$62.4K");
    expect(usd(412.5)).toBe("$412.50");
    expect(usd(null)).toBe("—");
  });

  it("formats calculator amounts to the cent", () => {
    expect(money(1049.054)).toBe("$1,049.05");
    expect(money(-12.5)).toBe("-$12.50");
    expect(money(0)).toBe("$0.00");
    expect(money(Number.NaN)).toBe("—");
  });

  it("says how long ago", () => {
    const now = 10 * 86_400_000;
    expect(ago(now - 30_000, now)).toBe("just now");
    expect(ago(now - 5 * 60_000, now)).toBe("5 min ago");
    expect(ago(now - 3 * 3_600_000, now)).toBe("3 h ago");
    expect(ago(now - 2 * 86_400_000, now)).toBe("2 days ago");
  });
});
