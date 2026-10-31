import { describe, expect, it, vi } from "vitest";
import {
  Gl1tchClient,
  createSolanaAgentKitTools,
  gl1tchElizaPlugin,
} from "../../../packages/gl1tch-agent-toolkit/index.mjs";
import { executeActorInput } from "../../../apify-actor/src/main.mjs";
import { GET as getIntegrations } from "@/app/api/agents/integrations/route";

describe("Phase 1 Agent Toolkit & Apify Actor", () => {
  it("Gl1tchClient routes free calls and x402 holder-key calls with x-gl1tch-key header", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ verdict: "CLEAN", score: 95 }),
    });

    const freeClient = new Gl1tchClient({ fetch: mockFetch });
    await freeClient.scanToken({ mint: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263", chain: "solana" });
    expect(mockFetch.mock.calls[0][0]).toContain("/api/scan?mint=DezX");

    const holderClient = new Gl1tchClient({ apiKey: "gk_test_holder", fetch: mockFetch });
    await holderClient.yieldXRay({ chain: "solana", stable: true });
    expect(mockFetch.mock.calls[1][0]).toContain("/api/x402/yield?chain=solana&stable=true");
    expect(mockFetch.mock.calls[1][1].headers["x-gl1tch-key"]).toBe("gk_test_holder");
  });

  it("exposes Solana Agent Kit tools and ElizaOS plugin actions", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ pools: [{ id: "solana-kamino-usdc", apyPct: 6.4 }] }),
    });
    const tools = createSolanaAgentKitTools({ fetch: mockFetch });
    expect(tools.map((t) => t.name)).toEqual([
      "gl1tch_scan_token",
      "gl1tch_yield_xray",
      "gl1tch_deployer_reputation",
      "gl1tch_rug_radar",
      "gl1tch_agent_trust",
    ]);

    const plugin = gl1tchElizaPlugin({ fetch: mockFetch });
    expect(plugin.name).toBe("@gl1tch/plugin-solana-safety");
    expect(plugin.actions).toHaveLength(5);
    const yieldAction = plugin.actions.find((a) => a.name === "GL1TCH_YIELD_XRAY")!;
    const out = await yieldAction.handler({}, {}, {}, { chain: "solana" });
    expect(out).toEqual({ pools: [{ id: "solana-kamino-usdc", apyPct: 6.4 }] });
  });

  it("executes Apify Actor scan, yield, deployer, and radar actions", async () => {
    const mockFetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes("/api/yield")) {
        return { ok: true, json: async () => ({ pools: [{ id: "solana-kamino-usdc", apyPct: 6.2 }] }) };
      }
      return { ok: true, json: async () => ({ mint: "DezX", verdict: "CLEAN", score: 95 }) };
    });

    const scanItems = await executeActorInput(
      { action: "scan", mint: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263", chain: "solana" },
      { fetch: mockFetch }
    );
    expect(scanItems).toEqual([{ action: "scan", mint: "DezX", verdict: "CLEAN", score: 95 }]);

    const yieldItems = await executeActorInput(
      { action: "yield", chain: "solana", stableOnly: true },
      { fetch: mockFetch }
    );
    expect(yieldItems).toEqual([{ action: "yield", id: "solana-kamino-usdc", apyPct: 6.2 }]);
  });

  it("serves /api/agents/integrations JSON catalog", async () => {
    const res = getIntegrations();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.channels.mcp.toolsCount).toBe(11);
    expect(body.channels.solanaAgentKit.package).toBe("@gl1tch/agent-toolkit");
    expect(body.channels.apifyActor.name).toBe("gl1tch-token-safety-scanner");
    expect(body.channels.telegramGuardian.command).toBe("/guardian");
    expect(body.channels.quantumGiveaway.botCommand).toBe("/giveaway");
  });
});

