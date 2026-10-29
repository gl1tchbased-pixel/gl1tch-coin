import { describe, it, expect, vi, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { toAtomic, fromAtomic } from "./amount";
import { readSwapFee, orderUrl, pickQuote, jupHeaders, SOL_MINT } from "./jupiter";
import { swapGate } from "./gate";

const BONK = "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263";
const TAKER = "7oWnxUS5HzDvV3hRS3vGTyW19sHek2TJmQ7YeVxAHYWC";
const REFERRAL = "CSxey8FbMS5dDG7Z5usH9gmXgLQqXTN6m25NRdqAC6g4";

// A real keyless /order answer (SOL → BONK, no taker), trimmed, 29 Oct 2026.
const ORDER = {
  inAmount: "10000000",
  outAmount: "32693327611",
  priceImpactPct: "0.00042547604099030966",
  feeMint: SOL_MINT,
  feeBps: 10,
  transaction: null,
  router: "metis",
  requestId: "01a187e9-0c32-750f-b9d0-4e0d4ded4403",
  inUsdValue: 1.0014583770308139,
  outUsdValue: 1.0018844735762895,
};

describe("amounts", () => {
  it("converts decimals exactly, both ways", () => {
    expect(toAtomic("0.25", 9)).toBe("250000000");
    expect(toAtomic("1", 5)).toBe("100000");
    expect(toAtomic("12.5", 6)).toBe("12500000");
    expect(fromAtomic("32693327611", 5)).toBe("326933.27611");
    expect(fromAtomic("250000000", 9)).toBe("0.25");
    expect(fromAtomic("100", 0)).toBe("100");
    expect(fromAtomic("5", 9)).toBe("0.000000005");
  });

  it("refuses zero, junk, and more fraction digits than the token has", () => {
    for (const bad of ["", "0", "0.0", "-1", "1e3", "abc", "1.2.3", "0.1234567891"]) expect(toAtomic(bad, 9)).toBeNull();
    expect(toAtomic("1.5", 0)).toBeNull();
  });
});

describe("the GL1TCH referral fee", () => {
  it("is off until a referral account is set", () => {
    expect(readSwapFee({})).toBeNull();
    expect(readSwapFee({ JUP_REFERRAL_ACCOUNT: "not-an-address" })).toBeNull();
  });

  it("defaults to 50 bps and stays inside Jupiter's 50–255 range", () => {
    expect(readSwapFee({ JUP_REFERRAL_ACCOUNT: REFERRAL })).toEqual({ account: REFERRAL, bps: 50 });
    expect(readSwapFee({ JUP_REFERRAL_ACCOUNT: REFERRAL, JUP_REFERRAL_FEE_BPS: "10" })?.bps).toBe(50);
    expect(readSwapFee({ JUP_REFERRAL_ACCOUNT: REFERRAL, JUP_REFERRAL_FEE_BPS: "900" })?.bps).toBe(255);
    expect(readSwapFee({ JUP_REFERRAL_ACCOUNT: REFERRAL, JUP_REFERRAL_FEE_BPS: "x" })?.bps).toBe(50);
  });

  it("goes on the order only when configured", () => {
    const p = { inputMint: SOL_MINT, outputMint: BONK, amount: "1000", taker: TAKER };
    const plain = new URL(orderUrl(p, null));
    expect(plain.origin + plain.pathname).toBe("https://api.jup.ag/swap/v2/order");
    expect(plain.searchParams.get("taker")).toBe(TAKER);
    expect(plain.searchParams.has("referralAccount")).toBe(false);
    const paid = new URL(orderUrl(p, { account: REFERRAL, bps: 75 }));
    expect(paid.searchParams.get("referralAccount")).toBe(REFERRAL);
    expect(paid.searchParams.get("referralFee")).toBe("75");
  });

  it("sends the Jupiter API key only when there is one", () => {
    expect(jupHeaders({})).toEqual({});
    expect(jupHeaders({ JUP_API_KEY: "k" })).toEqual({ "x-api-key": "k" });
  });
});

describe("reading a Jupiter order", () => {
  it("keeps what the widget shows, with price impact in percent", () => {
    const q = pickQuote(ORDER);
    expect(q).toMatchObject({ requestId: ORDER.requestId, transaction: null, outAmount: "32693327611", feeBps: 10, router: "metis", error: null });
    expect(q?.priceImpactPct).toBeCloseTo(0.0425, 3);
  });

  it("rejects anything that isn't an order", () => {
    expect(pickQuote(null)).toBeNull();
    expect(pickQuote({ error: "Route not found" })).toBeNull();
  });

  it("passes on Jupiter's reason when it can't build the transaction", () => {
    expect(pickQuote({ ...ORDER, transaction: "", errorMessage: "Insufficient funds" })?.error).toBe("Insufficient funds");
  });
});

describe("the safety gate", () => {
  it("never blocks a sell, whatever the verdict", () => {
    for (const v of ["RUG-SHAPED", "HIGH RISK", "UNKNOWN"]) expect(swapGate("sell", v, 10, false)).toEqual({ ok: true, warning: null });
  });

  it("lets buys through on CLEAN and LOW RISK", () => {
    expect(swapGate("buy", "CLEAN", 95, false).ok).toBe(true);
    expect(swapGate("buy", "LOW RISK", 80, false).ok).toBe(true);
  });

  it("asks for a confirmation on CAUTION", () => {
    expect(swapGate("buy", "CAUTION", 90, false)).toMatchObject({ ok: false, needsAck: true });
    expect(swapGate("buy", "CAUTION", 90, true)).toMatchObject({ ok: true });
  });

  it("refuses buys on HIGH RISK, RUG-SHAPED, unknown and partial reads, even with a confirmation", () => {
    for (const v of ["HIGH RISK", "RUG-SHAPED", "UNKNOWN"]) expect(swapGate("buy", v, 90, true)).toMatchObject({ ok: false, needsAck: false });
    expect(swapGate("buy", "CLEAN", 40, true)).toMatchObject({ ok: false, needsAck: false });
  });
});

describe("the order route", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
    vi.doUnmock("@/lib/x402/handlers");
  });
  const req = (q: string) => new NextRequest(`http://localhost/api/swap/order?${q}`);

  async function route(verdict: string, confidence = 95) {
    vi.doMock("@/lib/x402/handlers", () => ({ cachedScan: vi.fn(async () => ({ body: { verdict, score: 50, confidence }, cached: true })) }));
    return (await import("../../app/api/swap/order/route")).GET;
  }
  function stubFetch() {
    const calls: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
      calls.push(String(url));
      if (String(url).startsWith("https://api.jup.ag/")) return Response.json({ ...ORDER, transaction: "AQID" });
      const body = JSON.parse(String(init?.body ?? "{}"));
      if (body.method === "getTokenSupply") return Response.json({ jsonrpc: "2.0", id: 1, result: { value: { decimals: 5 } } });
      return new Response("no", { status: 500 });
    }));
    return calls;
  }

  it("refuses bad input before any network call", async () => {
    const calls = stubFetch();
    const GET = await route("CLEAN");
    for (const q of ["", `side=buy&mint=${BONK}`, `side=hold&mint=${BONK}&taker=${TAKER}&amount=1`, `side=buy&mint=${SOL_MINT}&taker=${TAKER}&amount=1`]) {
      expect((await GET(req(q))).status).toBe(400);
    }
    expect(calls).toEqual([]);
  });

  it("blocks a buy into a rug-shaped token and never asks Jupiter", async () => {
    const calls = stubFetch();
    const GET = await route("RUG-SHAPED");
    const res = await GET(req(`side=buy&mint=${BONK}&taker=${TAKER}&amount=0.1`));
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ blocked: true, verdict: "RUG-SHAPED" });
    expect(calls.some((u) => u.includes("api.jup.ag"))).toBe(false);
  });

  it("quotes a sell of the same token, with no GL1TCH fee while none is configured", async () => {
    const calls = stubFetch();
    vi.stubEnv("JUP_REFERRAL_ACCOUNT", "");
    const GET = await route("RUG-SHAPED");
    const res = await GET(req(`side=sell&mint=${BONK}&taker=${TAKER}&amount=1000`));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toMatchObject({ side: "sell", gl1tchFeeBps: 0, decimals: { in: 5, out: 9 } });
    const jup = new URL(calls.find((u) => u.includes("api.jup.ag"))!);
    expect(jup.searchParams.get("inputMint")).toBe(BONK);
    expect(jup.searchParams.get("outputMint")).toBe(SOL_MINT);
    expect(jup.searchParams.get("amount")).toBe("100000000");
    expect(jup.searchParams.has("referralAccount")).toBe(false);
  });

  it("adds the referral fee to a clean buy once the founder sets the account", async () => {
    const calls = stubFetch();
    vi.stubEnv("JUP_REFERRAL_ACCOUNT", REFERRAL);
    const GET = await route("CLEAN");
    const res = await GET(req(`side=buy&mint=${BONK}&taker=${TAKER}&amount=0.5`));
    expect(res.status).toBe(200);
    expect((await res.json()).gl1tchFeeBps).toBe(50);
    const jup = new URL(calls.find((u) => u.includes("api.jup.ag"))!);
    expect(jup.searchParams.get("amount")).toBe("500000000");
    expect(jup.searchParams.get("referralAccount")).toBe(REFERRAL);
  });

  it("caps a buy at 100 SOL", async () => {
    stubFetch();
    const GET = await route("CLEAN");
    expect((await GET(req(`side=buy&mint=${BONK}&taker=${TAKER}&amount=101`))).status).toBe(400);
  });
});
