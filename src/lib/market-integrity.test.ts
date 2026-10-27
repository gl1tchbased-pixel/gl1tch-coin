import { describe, it, expect } from "vitest";
import {
  tradeActivityCheck, walletNetworkCheck, peakDrawdown, integrityRisks, capForIntegrity, biggestNetwork,
} from "./market-integrity";
import type { ScanCheck } from "./scan";

// Fixtures are real 24-hour readings from 26 Oct 2026 (DexScreener trades, GeckoTerminal wallets,
// RugCheck insider networks).
const SI276 = { volume24h: 97_163, buys: 25_332, sells: 9_322, traders: 4_342 }; // volume bots
const BONK = { volume24h: 373_586, buys: 2_375, sells: 4_007, traders: 2_295 };
const FRESH = { volume24h: 943_799, buys: 8_143, sells: 7_164, traders: null }; // launch day, high churn
const QUIET = { volume24h: 10_078, buys: 62, sells: 54, traders: 84 };

describe("tradeActivityCheck", () => {
  it("fails micro-trade volume: thousands of trades averaging a few dollars", () => {
    const r = tradeActivityCheck(SI276);
    expect(r.status).toBe("fail");
    expect(r.value).toBe("$2.80 avg · 34,654 trades");
    expect(r.explain).toMatch(/volume bots/);
    expect(r.explain).toMatch(/2\.7 buys for every sell/);
  });
  it("passes organic trading and names the wallets when known", () => {
    const r = tradeActivityCheck(BONK);
    expect(r.status).toBe("pass");
    expect(r.value).toBe("$59 avg · 6,382 trades");
    expect(r.explain).toMatch(/2,295 wallets/);
  });
  it("doesn't flag a busy launch day with real-sized trades", () => {
    expect(tradeActivityCheck(FRESH).status).toBe("pass");
  });
  it("warns on small average trades that aren't yet bot-sized", () => {
    expect(tradeActivityCheck({ volume24h: 15_000, buys: 900, sells: 600, traders: null }).status).toBe("warn");
  });
  it("warns on a buy-bot pattern: far more buys than sells in small slices", () => {
    const r = tradeActivityCheck({ volume24h: 30_000, buys: 1_400, sells: 400, traders: null });
    expect(r.status).toBe("warn");
    expect(r.explain).toMatch(/3\.5 buys for every sell/);
  });
  it("flags the same wallets trading back and forth", () => {
    expect(tradeActivityCheck({ volume24h: 400_000, buys: 3_000, sells: 3_000, traders: 250 }).status).toBe("fail");
    expect(tradeActivityCheck({ volume24h: 400_000, buys: 3_000, sells: 3_000, traders: 500 }).status).toBe("warn");
  });
  it("is unknown when there's too little trading to judge", () => {
    expect(tradeActivityCheck({ volume24h: 900, buys: 30, sells: 20, traders: null }).status).toBe("unknown");
    expect(tradeActivityCheck({ volume24h: null, buys: null, sells: null }).status).toBe("unknown");
    expect(tradeActivityCheck(QUIET).status).toBe("pass");
  });
});

describe("walletNetworkCheck", () => {
  it("fails when one linked network is a large share of all holders", () => {
    const r = walletNetworkCheck(2_031, 6_819);
    expect(r.status).toBe("fail");
    expect(r.value).toBe("2,031 of 6,819 holders (30%)");
  });
  it("warns at a smaller but notable share", () => {
    expect(walletNetworkCheck(600, 5_000).status).toBe("warn");
  });
  it("passes big tokens whose largest network is a sliver of holders", () => {
    const r = walletNetworkCheck(7_017, 814_427);
    expect(r.status).toBe("pass");
    expect(r.value).toBe("7,017 of 814,427 holders (0.9%)");
  });
  it("ignores tiny networks on tiny tokens", () => {
    expect(walletNetworkCheck(12, 40).status).toBe("pass");
  });
  it("passes when no network was found and is unknown without data", () => {
    expect(walletNetworkCheck(0, 3_055)).toMatchObject({ status: "pass", value: "none found" });
    expect(walletNetworkCheck(null, 3_055).status).toBe("unknown");
    expect(walletNetworkCheck(200, null).status).toBe("unknown");
  });
});

describe("biggestNetwork", () => {
  it("returns the largest network size, 0 for an empty list, null when absent", () => {
    expect(biggestNetwork([{ size: 7 }, { size: 2_031 }, { size: 2 }])).toBe(2_031);
    expect(biggestNetwork([])).toBe(0);
    expect(biggestNetwork(undefined)).toBeNull();
  });
});

describe("peakDrawdown", () => {
  const day = 86_400_000;
  it("measures the fall from the highest daily close", () => {
    const r = peakDrawdown([{ t: 0, c: 1 }, { t: day, c: 10 }, { t: 2 * day, c: 2 }, { t: 3 * day, c: 0.31 }]);
    expect(r?.pct).toBeCloseTo(96.9, 1);
    expect(r?.peakAt).toBe(day);
  });
  it("is null with fewer than two candles", () => {
    expect(peakDrawdown([{ t: 0, c: 1 }])).toBeNull();
    expect(peakDrawdown([])).toBeNull();
  });
});

describe("integrityRisks", () => {
  it("names a collapse, paid promotion and a missing public presence", () => {
    const risks = integrityRisks({ fromPeakPct: 96.9, peakAt: Date.UTC(2026, 8, 19), boosts: 10, links: 0 });
    expect(risks).toEqual([
      { name: "Down 97% from its peak (19 Sep)", level: "danger" },
      { name: "Paid DexScreener promotion (10 boosts)", level: "info" },
      { name: "No website or socials listed", level: "info" },
    ]);
  });
  it("warns on a deep fall and stays quiet otherwise", () => {
    expect(integrityRisks({ fromPeakPct: 88, peakAt: Date.UTC(2026, 9, 9), boosts: 0, links: 2 })).toEqual([
      { name: "Down 88% from its peak (9 Oct)", level: "warn" },
    ]);
    expect(integrityRisks({ fromPeakPct: 40, peakAt: 0, boosts: 0, links: null })).toEqual([]);
  });
});

describe("capForIntegrity", () => {
  const check = (key: string, status: ScanCheck["status"]): ScanCheck => ({ key, label: key, status, value: "", explain: "" });
  it("caps a clean read at CAUTION, score included, when the volume is botted or the holders are one network", () => {
    expect(capForIntegrity("CLEAN", 98, [check("trade_quality", "fail")])).toEqual({ verdict: "CAUTION", score: 74 });
    expect(capForIntegrity("LOW RISK", 70, [check("wallet_network", "fail")])).toEqual({ verdict: "CAUTION", score: 70 });
  });
  it("leaves worse verdicts and clean integrity alone", () => {
    expect(capForIntegrity("HIGH RISK", 40, [check("trade_quality", "fail")])).toEqual({ verdict: "HIGH RISK", score: 40 });
    expect(capForIntegrity("CLEAN", 95, [check("trade_quality", "warn"), check("wallet_network", "pass")])).toEqual({ verdict: "CLEAN", score: 95 });
  });
});
