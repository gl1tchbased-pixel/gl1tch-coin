import { describe, it, expect, vi, afterEach } from "vitest";
import { NextRequest } from "next/server";

const BONK = "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263";
const req = (path: string) => new NextRequest(`http://localhost${path}`);

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("paid routes without a receiving wallet", () => {
  it.each([
    ["scan", `/api/x402/scan?mint=${BONK}`],
    ["agent", `/api/x402/agent?address=${BONK}`],
    ["deployer", `/api/x402/deployer?address=${BONK}`],
  ])("%s answers 503 'paid API not configured', never an empty 402", async (id, path) => {
    vi.stubEnv("X402_PAY_TO_SOLANA", "");
    vi.stubEnv("X402_PAY_TO_BASE", "");
    const { GET } = await import(`../../app/api/x402/${id}/route`);
    const res: Response = await GET(req(path));
    expect(res.status).toBe(503);
    expect(res.headers.get("cache-control")).toBe("private, no-store");
    expect(await res.json()).toEqual({ error: "paid API not configured" });
  });
});

describe("paid handlers validate their own input (after the challenge; a 400 is never settled)", () => {
  it("scan needs a valid mint", async () => {
    const { scanHandler } = await import("./handlers");
    expect((await scanHandler(req("/api/x402/scan"))).status).toBe(400);
    expect((await scanHandler(req("/api/x402/scan?mint=xyz"))).status).toBe(400);
    expect((await scanHandler(req("/api/x402/scan?q=bonk"))).status).toBe(400);
  });

  it("agent and deployer need a valid address and chain", async () => {
    const { agentHandler, deployerHandler } = await import("./handlers");
    expect((await agentHandler(req("/api/x402/agent?address=bad"))).status).toBe(400);
    expect((await agentHandler(req(`/api/x402/agent?address=${BONK}&chain=nope`))).status).toBe(400);
    expect((await deployerHandler(req("/api/x402/deployer"))).status).toBe(400);
  });
});
