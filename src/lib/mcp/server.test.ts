import { describe, it, expect, vi } from "vitest";
import { buildMcpHandler, withRateLimit, type McpDeps } from "./server";
import type { AgentAssessment } from "@/lib/agent-trust";
import type { DeployerReputation } from "@/lib/signal-graph";

/** One JSON-RPC call over Streamable HTTP; reads a JSON or SSE answer. */
async function call(handler: (req: Request) => Promise<Response>, method: string, params: unknown = {}, ip = "1.2.3.4") {
  const res = await handler(
    new Request("https://gl1tchbased.xyz/api/mcp", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
        "mcp-protocol-version": "2025-06-18",
        "x-forwarded-for": ip,
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    })
  );
  const text = await res.text();
  const data = text.includes("data:") ? text.split("\n").filter((l) => l.startsWith("data:")).pop()!.slice(5) : text;
  return { status: res.status, body: JSON.parse(data || "{}") as { result?: Record<string, unknown>; error?: { message: string } } };
}

function fakeDeps(over: Partial<McpDeps> = {}): McpDeps {
  return {
    scan: vi.fn(async () => ({
      status: 200,
      body: { verdict: "HIGH RISK", score: 12, confidence: 90, name: "Foo", symbol: "FOO", chain: "solana", mint: "Mint1111111111111111111111111111111111111111", bottomLine: "Mint authority is live.", risks: [{ name: "Mint authority active" }] },
    })),
    agent: vi.fn(async (): Promise<AgentAssessment> => ({ address: "A", chain: "solana", score: 30, level: "unknown", reasons: ["Not registered"], registered: false, verified: false })),
    deployer: vi.fn(async (): Promise<DeployerReputation> => ({ deployer: "D", chain: "solana", tokensSeen: 3, flaggedCount: 2, worstScore: 5, level: "serial", note: "2 of 3 flagged", recent: [] })),
    ...over,
  };
}

const text = (r: { result?: Record<string, unknown> }) => ((r.result?.content as { text: string }[]) ?? []).map((c) => c.text).join("\n");
const MINT = "Mint1111111111111111111111111111111111111111";

describe("withRateLimit", () => {
  it("answers 429 once an IP passes its per-minute budget, and leaves other IPs alone", async () => {
    const h = withRateLimit(buildMcpHandler(fakeDeps()), 3);
    for (let i = 0; i < 3; i++) expect((await call(h, "tools/list", {}, "9.9.9.9")).status).toBe(200);
    expect((await call(h, "tools/list", {}, "9.9.9.9")).status).toBe(429);
    expect((await call(h, "tools/list", {}, "8.8.8.8")).status).toBe(200);
  });
});

describe("GL1TCH MCP server", () => {
  it("lists the three tools", async () => {
    const { body } = await call(buildMcpHandler(fakeDeps()), "tools/list");
    const names = ((body.result?.tools as { name: string }[]) ?? []).map((t) => t.name).sort();
    expect(names).toEqual(["check_agent_wallet", "deployer_reputation", "scan_token"]);
  });

  it("scan_token returns the verdict, the score and a link to the full report", async () => {
    const deps = fakeDeps();
    const { body } = await call(buildMcpHandler(deps), "tools/call", { name: "scan_token", arguments: { mint: MINT } });
    const t = text(body);
    expect(t).toContain("HIGH RISK");
    expect(t).toContain("12/100");
    expect(t).toContain(`https://gl1tchbased.xyz/scan?t=solana:${MINT}`);
    expect(deps.scan).toHaveBeenCalledWith(MINT, undefined);
    expect(body.result?.isError).toBeFalsy();
  });

  it("reports a failed scan as a tool error, not a verdict", async () => {
    const deps = fakeDeps({ scan: vi.fn(async () => ({ status: 422, body: { error: "scan failed" } })) });
    const { body } = await call(buildMcpHandler(deps), "tools/call", { name: "scan_token", arguments: { mint: MINT } });
    expect(body.result?.isError).toBe(true);
    expect(text(body)).toContain("scan failed");
  });

  it("refuses a malformed address before calling the scanner", async () => {
    const deps = fakeDeps();
    const { body } = await call(buildMcpHandler(deps), "tools/call", { name: "scan_token", arguments: { mint: "not an address" } });
    expect(body.result?.isError ?? !!body.error).toBe(true);
    expect(deps.scan).not.toHaveBeenCalled();
  });

  it("checks agent wallets and deployers on Solana unless told otherwise", async () => {
    const deps = fakeDeps();
    const h = buildMcpHandler(deps);
    const a = await call(h, "tools/call", { name: "check_agent_wallet", arguments: { address: MINT } });
    expect(text(a.body)).toContain("unknown");
    expect(deps.agent).toHaveBeenCalledWith(MINT, "solana");
    const d = await call(h, "tools/call", { name: "deployer_reputation", arguments: { address: MINT, chain: "base" } });
    expect(text(d.body)).toContain("2 of 3");
    expect(deps.deployer).toHaveBeenCalledWith(MINT, "base");
  });
});
