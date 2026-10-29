import { describe, it, expect, vi, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { revenueEntryFromSettle } from "./revenue";
import { SOLANA_MAINNET } from "./x402/config";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.resetModules();
});

describe("recordRevenue", () => {
  it("logs a ledger write the bot refused instead of swallowing it", async () => {
    vi.stubEnv("STATS_TOKEN", "t");
    const fetchMock = vi.fn(async () => new Response("no", { status: 500 }));
    vi.stubGlobal("fetch", fetchMock);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.resetModules(); // the static import above cached the module before STATS_TOKEN was set
    const { recordRevenue } = await import("./revenue");
    recordRevenue({ tx: "5".repeat(88), network: SOLANA_MAINNET, route: "scan", amountMicro: 10_000, self: false, at: 1 });
    await new Promise((r) => setTimeout(r, 20));
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("500"));
  });
});

describe("recordQuote", () => {
  it("sends only the route and a truncated user agent, token-guarded, and never throws on failure", async () => {
    vi.stubEnv("STATS_TOKEN", "t");
    const fetchMock = vi.fn<(url: string, init: RequestInit) => Promise<Response>>(async () => {
      throw new Error("down");
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.resetModules();
    const { recordQuote } = await import("./revenue");
    recordQuote("radar", "a".repeat(300));
    await new Promise((r) => setTimeout(r, 20));
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/revenue\/quote$/);
    expect((init.headers as Record<string, string>)["x-stats-token"]).toBe("t");
    expect(JSON.parse(init.body as string)).toEqual({ route: "radar", ua: "a".repeat(120) });
  });

  it("does nothing without the stats token", async () => {
    vi.stubEnv("STATS_TOKEN", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    vi.resetModules();
    const { recordQuote } = await import("./revenue");
    recordQuote("scan", "x");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("public revenue copy", () => {
  it.each(["src/app/revenue/page.tsx", "public/llms.txt", "src/app/agents/docs/page.tsx"])(
    "%s doesn't promise every payment (the ledger lists what was reported, latest 50)",
    (file) => {
      expect(readFileSync(file, "utf8")).not.toMatch(/every payment/i);
    }
  );
});

const TX = "5".repeat(88);
const URL_SCAN = "https://gl1tchbased.xyz/api/x402/scan?mint=DezX";
const ok = { success: true, transaction: TX, network: SOLANA_MAINNET, amount: "10000", payer: "Payer111" };

describe("revenueEntryFromSettle", () => {
  it("maps a successful settlement to a paid ledger entry", () => {
    expect(revenueEntryFromSettle({ result: ok, resourceUrl: URL_SCAN }, new Set(), 42)).toEqual({
      tx: TX,
      network: SOLANA_MAINNET,
      route: "scan",
      amountMicro: 10_000,
      payer: "Payer111",
      self: false,
      at: 42,
    });
  });

  it("ignores a failed settlement", () => {
    expect(revenueEntryFromSettle({ result: { ...ok, success: false }, resourceUrl: URL_SCAN }, new Set())).toBeNull();
  });

  it("ignores a resource that is not a paid route", () => {
    expect(revenueEntryFromSettle({ result: ok, resourceUrl: "https://gl1tchbased.xyz/api/scan" }, new Set())).toBeNull();
  });

  it("falls back to the required amount when the settlement omits it", () => {
    const e = revenueEntryFromSettle({ result: { ...ok, amount: undefined }, requirementsAmount: "5000", resourceUrl: URL_SCAN }, new Set());
    expect(e?.amountMicro).toBe(5_000);
  });

  it("refuses an amount that is not a positive integer", () => {
    expect(revenueEntryFromSettle({ result: { ...ok, amount: "abc" }, resourceUrl: URL_SCAN }, new Set())).toBeNull();
    expect(revenueEntryFromSettle({ result: { ...ok, amount: "0" }, resourceUrl: URL_SCAN }, new Set())).toBeNull();
  });

  it("needs a transaction and a network", () => {
    expect(revenueEntryFromSettle({ result: { ...ok, transaction: "" }, resourceUrl: URL_SCAN }, new Set())).toBeNull();
    expect(revenueEntryFromSettle({ result: { ...ok, network: undefined }, resourceUrl: URL_SCAN }, new Set())).toBeNull();
  });

  it("flags a call marked as a self-test even without a payer", () => {
    const e = revenueEntryFromSettle({ result: { ...ok, payer: undefined }, resourceUrl: URL_SCAN, selfTest: true }, new Set());
    expect(e?.self).toBe(true);
  });

  it("flags our own test wallet as a self-test", () => {
    expect(revenueEntryFromSettle({ result: ok, resourceUrl: URL_SCAN }, new Set(["Payer111"]))?.self).toBe(true);
  });
});
