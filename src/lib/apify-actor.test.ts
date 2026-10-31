import { describe, expect, it, vi } from "vitest";
import { deliver, executeActorInput, isChargeable } from "../../apify-actor/src/main.mjs";

function api(routes: Record<string, unknown>) {
  const calls: string[] = [];
  const fetchImpl = vi.fn(async (url: string) => {
    const path = new URL(url).pathname;
    calls.push(url);
    if (!(path in routes)) return new Response("nope", { status: 404 });
    return new Response(JSON.stringify(routes[path]));
  });
  return { fetch: fetchImpl as unknown as typeof fetch, calls };
}

const clean = { mint: "A", verdict: "CLEAN", score: 95, confidence: 93 };

describe("the Apify actor reads the real API", () => {
  it("scans through /api/scan and passes the chain", async () => {
    const { fetch, calls } = api({ "/api/scan": clean });
    const items = await executeActorInput({ action: "scan", mint: "A", chain: "base" }, { fetch });
    expect(calls[0]).toContain("/api/scan?mint=A&chain=base");
    expect(items).toEqual([{ action: "scan", ...clean }]);
  });

  it("reads radar tokens from `caught`", async () => {
    const { fetch } = api({ "/api/radar": { scanned: 40, caught: [{ mint: "B", verdict: "CAUTION" }] } });
    expect(await executeActorInput({ action: "radar" }, { fetch })).toEqual([{ action: "radar", mint: "B", verdict: "CAUTION" }]);
  });

  it("refuses an oversized batch instead of quietly dropping tokens", async () => {
    const { fetch } = api({});
    const mints = Array.from({ length: 11 }, (_, i) => `m${i}`);
    await expect(executeActorInput({ action: "batch", mints }, { fetch })).rejects.toThrow(/At most 10/);
  });

  it("refuses an action it doesn't offer", async () => {
    const { fetch } = api({});
    await expect(executeActorInput({ action: "deployer" }, { fetch })).rejects.toThrow(/Unsupported/);
  });
});

describe("what gets charged", () => {
  it("keeps the other tokens when one fails, and doesn't charge the failure", async () => {
    const fetch = vi.fn(async (url: string) =>
      url.includes("mint=bad") ? new Response("down", { status: 503 }) : new Response(JSON.stringify(clean))
    ) as unknown as typeof globalThis.fetch;
    const items = await executeActorInput({ action: "batch", mints: ["bad", "A"] }, { fetch });
    expect(items.map(isChargeable)).toEqual([false, true]);
  });

  it("doesn't charge a degraded read, unless the token is a verified blue-chip", async () => {
    const { fetch } = api({ "/api/scan": { ...clean, confidence: 40 } });
    const [weak] = await executeActorInput({ action: "scan", mint: "A" }, { fetch });
    expect(isChargeable(weak)).toBe(false);
    const verified = api({ "/api/scan": { ...clean, confidence: 40, verified: true } });
    const [blue] = await executeActorInput({ action: "scan", mint: "A" }, { fetch: verified.fetch });
    expect(isChargeable(blue)).toBe(true);
  });

  it("saves before charging, and stops at the buyer's spending limit", async () => {
    const order: string[] = [];
    const actor = {
      pushData: vi.fn(async (item: { mint: string }) => void order.push(`push ${item.mint}`)),
      charge: vi.fn(async () => {
        order.push("charge");
        return { chargedCount: 1, eventChargeLimitReached: order.length >= 4 };
      }),
    };
    const charged = await deliver([{ mint: "1" }, { mint: "2" }, { mint: "3" }], actor);
    expect(order).toEqual(["push 1", "charge", "push 2", "charge"]);
    expect(charged).toBe(2);
  });

  it("delivers an uncharged item without charging for it", async () => {
    const actor = { pushData: vi.fn(async () => {}), charge: vi.fn(async () => ({ chargedCount: 1 })) };
    await deliver([{ mint: "1", error: "down" }], actor);
    expect(actor.pushData).toHaveBeenCalledOnce();
    expect(actor.charge).not.toHaveBeenCalled();
  });
});
