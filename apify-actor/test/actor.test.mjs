import { test, describe } from "node:test";
import assert from "node:assert";
import { executeActorInput, isChargeable, deliver, CHARGE_EVENT } from "../src/main.mjs";

describe("gl1tch-apify-actor (Pay-Per-Event)", () => {
  test("executes scan action and marks degraded results", async () => {
    const mockFetch = async (url) => {
      assert.ok(url.includes("/api/scan?mint=DezX"));
      return {
        ok: true,
        json: async () => ({
          mint: "DezX",
          verdict: "CLEAN",
          score: 95,
          confidence: 90,
          verified: true,
        }),
      };
    };

    const items = await executeActorInput({ action: "scan", mint: "DezX" }, { fetch: mockFetch });
    assert.strictEqual(items.length, 1);
    assert.strictEqual(items[0].action, "scan");
    assert.strictEqual(items[0].verdict, "CLEAN");
    assert.strictEqual(isChargeable(items[0]), true);
  });

  test("executes batch action up to 10 tokens", async () => {
    const mockFetch = async (url) => {
      const mint = new URL(url).searchParams.get("mint");
      return {
        ok: true,
        json: async () => ({
          mint,
          verdict: "CLEAN",
          score: 90,
          confidence: 85,
        }),
      };
    };

    const mints = ["MintA1111111111111111111111111111111111111", "MintB2222222222222222222222222222222222222"];
    const items = await executeActorInput({ action: "batch", mints }, { fetch: mockFetch });
    assert.strictEqual(items.length, 2);
    assert.strictEqual(items[0].mint, mints[0]);
    assert.strictEqual(items[1].mint, mints[1]);
  });

  test("executes radar action", async () => {
    const mockFetch = async (url) => {
      assert.ok(url.includes("/api/radar"));
      return {
        ok: true,
        json: async () => ({
          caught: [
            { mint: "Fresh1", verdict: "HIGH RISK", score: 25 },
            { mint: "Fresh2", verdict: "MED RISK", score: 65 },
          ],
        }),
      };
    };

    const items = await executeActorInput({ action: "radar" }, { fetch: mockFetch });
    assert.strictEqual(items.length, 2);
    assert.strictEqual(items[0].mint, "Fresh1");
    assert.strictEqual(items[0].action, "radar");
  });

  test("executes yield action", async () => {
    const mockFetch = async (url) => {
      assert.ok(url.includes("/api/yield"));
      return {
        ok: true,
        json: async () => ({
          opportunities: [
            { id: "kamino-usdc", chain: "solana", apy: 8.5 },
          ],
        }),
      };
    };

    const items = await executeActorInput({ action: "yield", chain: "solana" }, { fetch: mockFetch });
    assert.strictEqual(items.length, 1);
    assert.strictEqual(items[0].id, "kamino-usdc");
  });

  test("isChargeable excludes errors and degraded items", () => {
    assert.strictEqual(isChargeable({ verdict: "CLEAN", score: 90 }), true);
    assert.strictEqual(isChargeable({ error: "RPC failed" }), false);
    assert.strictEqual(isChargeable({ degraded: true }), false);
  });

  test("deliver charges only for chargeable results", async () => {
    const pushed = [];
    const chargedEvents = [];

    const mockActor = {
      pushData: async (item) => pushed.push(item),
      charge: async (opts) => {
        chargedEvents.push(opts);
        return { chargedCount: opts.count };
      },
    };

    const items = [
      { mint: "GoodToken", verdict: "CLEAN" },
      { mint: "FailedToken", error: "Not found" },
      { mint: "DegradedToken", degraded: true },
      { mint: "AnotherGoodToken", verdict: "MED RISK" },
    ];

    const chargedCount = await deliver(items, mockActor);
    assert.strictEqual(pushed.length, 4);
    assert.strictEqual(chargedEvents.length, 2);
    assert.strictEqual(chargedCount, 2);
    assert.strictEqual(chargedEvents[0].eventName, CHARGE_EVENT);
  });
});

