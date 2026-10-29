import { describe, it, expect, vi, afterEach } from "vitest";
import { getYieldSnapshot, getYieldHistory, findOpportunity, findOpportunityFresh } from "./client";
import type { YieldSnapshot } from "./types";

const SNAP = {
  updatedAt: 1,
  opportunities: [{ id: "base-aave-v3-usdc", chain: "base", symbol: "USDC" }],
  sources: [],
  prices: {},
  gas: {},
  network: { solanaEpochsPerYear: null, solanaInflation: null, solanaStakedShare: null },
} as unknown as YieldSnapshot;

const respond = (body: unknown, status = 200) => vi.fn(async () => new Response(JSON.stringify(body), { status }));

afterEach(() => vi.unstubAllGlobals());

describe("getYieldSnapshot", () => {
  it("returns the bridge snapshot", async () => {
    vi.stubGlobal("fetch", respond(SNAP));
    expect((await getYieldSnapshot())?.opportunities[0].id).toBe("base-aave-v3-usdc");
  });

  it("returns null when the bot is down, warming up, or answers junk", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("ECONNREFUSED"); }));
    expect(await getYieldSnapshot()).toBeNull();
    vi.stubGlobal("fetch", respond({ ok: false, error: "warming_up" }, 503));
    expect(await getYieldSnapshot()).toBeNull();
    vi.stubGlobal("fetch", respond({}));
    expect(await getYieldSnapshot()).toBeNull();
    vi.stubGlobal("fetch", respond({ updatedAt: 1, opportunities: [{ nope: true }] }));
    expect(await getYieldSnapshot()).toBeNull();
  });
});

describe("getYieldHistory", () => {
  it("returns points, and nothing for a bad id or a failure", async () => {
    vi.stubGlobal("fetch", respond({ id: "base-aave-v3-usdc", points: [{ t: 1, apy: 0.05, tvlUsd: 1, rate: null }] }));
    expect(await getYieldHistory("base-aave-v3-usdc")).toHaveLength(1);
    const f = vi.fn();
    vi.stubGlobal("fetch", f);
    expect(await getYieldHistory("../etc")).toEqual([]);
    expect(f).not.toHaveBeenCalled();
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("down"); }));
    expect(await getYieldHistory("base-aave-v3-usdc")).toEqual([]);
  });
});

describe("findOpportunity", () => {
  it("finds by id and tolerates a missing snapshot", () => {
    expect(findOpportunity(SNAP, "base-aave-v3-usdc")?.symbol).toBe("USDC");
    expect(findOpportunity(SNAP, "nope")).toBeNull();
    expect(findOpportunity(null, "base-aave-v3-usdc")).toBeNull();
  });
});

describe("findOpportunityFresh", () => {
  it("re-reads the bot without the cache when the cached snapshot doesn't know the id yet", async () => {
    const fresh = { ...SNAP, opportunities: [...SNAP.opportunities, { id: "tron-justlend-usdt", chain: "tron", symbol: "USDT" }] };
    const f = vi.fn(async (_url: string, init?: RequestInit) =>
      new Response(JSON.stringify(init?.cache === "no-store" ? fresh : SNAP), { status: 200 })
    );
    vi.stubGlobal("fetch", f);
    const r = await findOpportunityFresh(SNAP, "tron-justlend-usdt");
    expect(r.opportunity?.id).toBe("tron-justlend-usdt");
    expect(r.snapshot?.opportunities).toHaveLength(2);
    expect(f).toHaveBeenCalledTimes(1);
  });

  it("doesn't refetch on a hit, and returns null for an unknown id", async () => {
    const f = vi.fn(async () => new Response(JSON.stringify(SNAP), { status: 200 }));
    vi.stubGlobal("fetch", f);
    expect((await findOpportunityFresh(SNAP, "base-aave-v3-usdc")).opportunity?.id).toBe("base-aave-v3-usdc");
    expect(f).not.toHaveBeenCalled();
    expect((await findOpportunityFresh(SNAP, "nope")).opportunity).toBeNull();
  });
});
