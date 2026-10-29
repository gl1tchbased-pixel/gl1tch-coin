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
    ["verdict", `/api/x402/verdict?mint=${BONK}`],
    ["radar", "/api/x402/radar"],
    ["random", "/api/x402/random?min=1&max=6"],
    ["quick", `/api/x402/quick?mint=${BONK}`],
    ["batch", `/api/x402/batch?mints=${BONK}`],
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

describe("a mistyped or refused receiving wallet", () => {
  it("fails closed with 503 and names the variable, instead of silently dropping that network", async () => {
    vi.stubEnv("X402_PAY_TO_SOLANA", "BSq18aJBhxYJgeEbcA3jGQNU1vmwZdo2PQkkpVsK7W6o"); // the attester: refused
    vi.stubEnv("X402_PAY_TO_BASE", "0x" + "ab".repeat(20)); // valid
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const { GET } = await import("../../app/api/x402/scan/route");
    const res: Response = await GET(req(`/api/x402/scan?mint=${BONK}`));
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: "paid API misconfigured" });
    expect(err).toHaveBeenCalledWith(expect.stringContaining("X402_PAY_TO_SOLANA"));
    err.mockRestore();
  });
});

describe("paid handlers validate their own input (after the challenge; a 400 is never settled)", () => {
  it("scan needs a valid mint", async () => {
    const { scanHandler } = await import("./handlers");
    expect((await scanHandler(req("/api/x402/scan"))).status).toBe(400);
    expect((await scanHandler(req("/api/x402/scan?mint=xyz"))).status).toBe(400);
    expect((await scanHandler(req("/api/x402/scan?q=bonk"))).status).toBe(400);
  });

  it("quick needs a valid mint", async () => {
    const { quickHandler } = await import("./handlers");
    expect((await quickHandler(req("/api/x402/quick"))).status).toBe(400);
    expect((await quickHandler(req("/api/x402/quick?mint=xyz"))).status).toBe(400);
  });

  it("batch needs 1 to 10 valid addresses", async () => {
    const { batchHandler } = await import("./handlers");
    expect((await batchHandler(req("/api/x402/batch"))).status).toBe(400);
    expect((await batchHandler(req(`/api/x402/batch?mints=${BONK},xyz`))).status).toBe(400);
    expect((await batchHandler(req(`/api/x402/batch?mints=${Array(11).fill(0).map((_, i) => BONK.slice(0, -2) + String(10 + i)).join(",")}`))).status).toBe(400);
  });

  it("radar refuses an unreadable since", async () => {
    const { radarHandler } = await import("./handlers");
    expect((await radarHandler(req("/api/x402/radar?since=yesterday"))).status).toBe(400);
  });

  it("verdict needs a valid mint", async () => {
    const { verdictHandler } = await import("./handlers");
    expect((await verdictHandler(req("/api/x402/verdict"))).status).toBe(400);
    expect((await verdictHandler(req("/api/x402/verdict?mint=xyz"))).status).toBe(400);
  });

  it("random refuses a bad range before touching the beacon", async () => {
    const { randomHandler } = await import("./handlers");
    const res = await randomHandler(req("/api/x402/random?min=9&max=1"));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("not charged");
  });

  it("agent and deployer need a valid address and chain", async () => {
    const { agentHandler, deployerHandler } = await import("./handlers");
    expect((await agentHandler(req("/api/x402/agent?address=bad"))).status).toBe(400);
    expect((await agentHandler(req(`/api/x402/agent?address=${BONK}&chain=nope`))).status).toBe(400);
    expect((await deployerHandler(req("/api/x402/deployer"))).status).toBe(400);
  });
});

describe("the bot's revenue ledger accepts every paid route", () => {
  it("records a settlement for each PaidRouteId (a route the bot refuses would vanish from /revenue)", async () => {
    const { PAID_ROUTES } = await import("./config");
    const { parseRevenueEntry } = await import("../../../bot/src/revenue");
    for (const route of Object.keys(PAID_ROUTES)) {
      const entry = parseRevenueEntry({ tx: "5".repeat(88), network: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp", route, amountMicro: 3000 });
      expect(entry, route).not.toBeNull();
    }
  });
});
