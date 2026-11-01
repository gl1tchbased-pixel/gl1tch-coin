import { test, describe } from "node:test";
import assert from "node:assert";
import {
  Gl1tchClient,
  gl1tchPreTradeGuard,
  gl1tchSafetyProvider,
  gl1tchPreTradeEvaluator,
  drawProvablyFairWinners,
  rollProvablyFairDice,
  shuffleProvablyFair,
  verifyAgentTrust,
  createSolanaAgentKitTools,
  gl1tchElizaPlugin,
} from "../index.mjs";

describe("gl1tch-agent-toolkit (v1.2.0)", () => {
  test("Gl1tchClient defaults and path routing", async () => {
    const calls = [];
    const mockFetch = async (url, opts) => {
      calls.push({ url, headers: opts.headers });
      return {
        ok: true,
        json: async () => ({ ok: true, data: "test" }),
      };
    };

    const client = new Gl1tchClient({ fetch: mockFetch });
    await client.scanToken({ mint: "So11111111111111111111111111111111111111112" });
    assert.strictEqual(calls.length, 1);
    assert.ok(calls[0].url.includes("/api/scan?mint=So11111111111111111111111111111111111111112"));

    // Holder key forces x402 endpoint routing with header
    const paidClient = new Gl1tchClient({ apiKey: "gk_test_holder_key", fetch: mockFetch });
    await paidClient.quickCheck({ mint: "DezX" });
    assert.strictEqual(calls.length, 2);
    assert.ok(calls[1].url.includes("/api/x402/quick?mint=DezX"));
    assert.strictEqual(calls[1].headers["x-gl1tch-key"], "gk_test_holder_key");
  });

  test("gl1tchPreTradeGuard approves CLEAN tokens and halts honeypots/rugs", async () => {
    // 1. Clean token
    const mockCleanFetch = async () => ({
      ok: true,
      json: async () => ({ verdict: "CLEAN", score: 95, honeypot: false }),
    });
    const cleanGuard = await gl1tchPreTradeGuard("DezX", { fetch: mockCleanFetch });
    assert.strictEqual(cleanGuard.approved, true);
    assert.strictEqual(cleanGuard.score, 95);
    assert.strictEqual(cleanGuard.verdict, "CLEAN");

    // 2. Honeypot token
    const mockHoneypotFetch = async () => ({
      ok: true,
      json: async () => ({ verdict: "HIGH RISK", score: 20, honeypot: true }),
    });
    const honeypotGuard = await gl1tchPreTradeGuard("BadToken123", { fetch: mockHoneypotFetch });
    assert.strictEqual(honeypotGuard.approved, false);
    assert.ok(honeypotGuard.reason.includes("BLOCKED: Honeypot"));

    // 3. Low score token
    const mockLowScoreFetch = async () => ({
      ok: true,
      json: async () => ({ verdict: "MED RISK", score: 50, honeypot: false }),
    });
    const lowScoreGuard = await gl1tchPreTradeGuard("MedToken123", { minScore: 65, fetch: mockLowScoreFetch });
    assert.strictEqual(lowScoreGuard.approved, false);
    assert.ok(lowScoreGuard.reason.includes("below the required threshold"));
  });

  test("gl1tchSafetyProvider injects prompt intelligence for detected mints", async () => {
    const mockFetch = async () => ({
      ok: true,
      json: async () => ({ verdict: "CLEAN", score: 92, bottomLine: "Verified blue-chip." }),
    });

    const provider = gl1tchSafetyProvider({ fetch: mockFetch });
    const context = await provider.get(
      null,
      { content: { text: "Should I buy DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263 on raydium?" } },
      null
    );

    assert.ok(context !== null);
    assert.ok(context.includes("[GL1TCH Safety Intelligence]"));
    assert.ok(context.includes("Score: 92/100"));
    assert.ok(context.includes("CLEAN"));
  });

  test("gl1tchPreTradeEvaluator evaluates safe vs dangerous transactions", async () => {
    const mockFetch = async () => ({
      ok: true,
      json: async () => ({ verdict: "RUG-SHAPED", score: 10, honeypot: true }),
    });

    const evaluator = gl1tchPreTradeEvaluator({ fetch: mockFetch });
    const evaluation = await evaluator.handler(
      null,
      { content: { text: "swap 10 SOL for 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU" } }
    );

    assert.strictEqual(evaluation.verified, false);
    assert.strictEqual(evaluation.score, 10);
    assert.strictEqual(evaluation.verdict, "RUG-SHAPED");
  });

  test("drawProvablyFairWinners deterministically selects winners with drand entropy", async () => {
    const mockFetch = async () => ({
      ok: true,
      json: async () => ({
        round: 450123,
        signature: "8f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a",
        randomness: "abcd1234ef5678",
      }),
    });

    const participants = ["alice.sol", "bob.sol", "charlie.sol", "dave.sol", "eve.sol"];
    const result = await drawProvablyFairWinners({ participants, count: 2, fetch: mockFetch });

    assert.strictEqual(result.winners.length, 2);
    assert.strictEqual(result.round, 450123);
    assert.ok(result.signature);
    assert.ok(participants.includes(result.winners[0]));
    assert.ok(participants.includes(result.winners[1]));
    assert.notStrictEqual(result.winners[0], result.winners[1]); // no duplicate winners
  });

  test("rollProvablyFairDice returns numbers within range", async () => {
    const mockFetch = async () => ({
      ok: true,
      json: async () => ({ numbers: [4], round: 999, signature: "sig123" }),
    });

    const result = await rollProvablyFairDice({ sides: 6, count: 1, fetch: mockFetch });
    assert.strictEqual(result.rolls.length, 1);
    assert.strictEqual(result.rolls[0], 4);
    assert.strictEqual(result.round, 999);
  });

  test("verifyAgentTrust checks KYA credentials and rank", async () => {
    const mockFetch = async () => ({
      ok: true,
      json: async () => ({
        score: 88,
        level: "trusted",
        reasons: ["Verified on-chain attestation", "Clean transaction history"],
        badges: ["KYA_VERIFIED"],
        proven: true,
      }),
    });

    const trust = await verifyAgentTrust({
      address: "AgentWallet111111111111111111111111111111111",
      requiredLevel: "neutral",
      fetch: mockFetch,
    });

    assert.strictEqual(trust.isTrusted, true);
    assert.strictEqual(trust.score, 88);
    assert.strictEqual(trust.level, "trusted");
    assert.ok(trust.erc8004Url.includes("/api/agent/erc8004"));
  });

  test("createSolanaAgentKitTools exports all 8 core actions", () => {
    const tools = createSolanaAgentKitTools();
    assert.strictEqual(tools.length, 8);
    const names = tools.map((t) => t.name);
    assert.ok(names.includes("gl1tch_scan_token"));
    assert.ok(names.includes("gl1tch_quick_check"));
    assert.ok(names.includes("gl1tch_yield_xray"));
    assert.ok(names.includes("gl1tch_deployer_reputation"));
    assert.ok(names.includes("gl1tch_rug_radar"));
    assert.ok(names.includes("gl1tch_agent_trust"));
    assert.ok(names.includes("gl1tch_verifiable_random"));
    assert.ok(names.includes("gl1tch_token_verdict"));
  });

  test("gl1tchElizaPlugin bundles actions, providers, and evaluators", () => {
    const plugin = gl1tchElizaPlugin();
    assert.strictEqual(plugin.name, "@gl1tch/plugin-solana-safety");
    assert.strictEqual(plugin.actions.length, 8);
    assert.strictEqual(plugin.providers.length, 1);
    assert.strictEqual(plugin.evaluators.length, 1);
  });
});

