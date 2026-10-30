import { test, describe } from "node:test";
import assert from "node:assert";
import { Gl1tchAcpWorker, ACP_SERVICES, DEFAULT_BASE_TREASURY } from "../src/acp-worker.mjs";

describe("Gl1tchAcpWorker (ERC-8183)", () => {
  test("exposes valid ACP agent profile & services", () => {
    const worker = new Gl1tchAcpWorker();
    const profile = worker.getProfile();
    assert.strictEqual(profile.protocol, "ERC-8183");
    assert.strictEqual(profile.network, "eip155:8453");
    assert.strictEqual(profile.treasuryAddress, DEFAULT_BASE_TREASURY);
    assert.strictEqual(profile.services.length, ACP_SERVICES.length);
  });

  test("executes token_safety_scan job and returns escrow settlement", async () => {
    const mockFetch = async (url) => {
      assert.ok(url.includes("/api/v1/scan?mint=DezX"));
      return {
        ok: true,
        json: async () => ({ mint: "DezX", verdict: "CLEAN", score: 95 }),
      };
    };

    const worker = new Gl1tchAcpWorker({ fetch: mockFetch });
    const result = await worker.executeJob({
      jobId: "job-101",
      serviceId: "gl1tch.token_safety_scan",
      input: { mint: "DezX" },
    });

    assert.strictEqual(result.jobId, "job-101");
    assert.strictEqual(result.status, "COMPLETED");
    assert.strictEqual(result.deliverable.verdict, "CLEAN");
    assert.strictEqual(result.escrowSettlement.amountUsdc, 0.005);
    assert.strictEqual(result.escrowSettlement.recipient, DEFAULT_BASE_TREASURY);
  });

  test("executes yield_xray job and returns escrow settlement", async () => {
    const mockFetch = async (url) => {
      assert.ok(url.includes("/api/yield?chain=solana"));
      return {
        ok: true,
        json: async () => ({ count: 5, opportunities: [{ id: "kamino-usdc", apy: 7.2 }] }),
      };
    };

    const worker = new Gl1tchAcpWorker({ fetch: mockFetch });
    const result = await worker.executeJob({
      jobId: "job-102",
      serviceId: "gl1tch.yield_xray",
      input: { chain: "solana", stable: true },
    });

    assert.strictEqual(result.jobId, "job-102");
    assert.strictEqual(result.status, "COMPLETED");
    assert.strictEqual(result.deliverable.count, 5);
    assert.strictEqual(result.escrowSettlement.amountUsdc, 0.003);
  });
});

