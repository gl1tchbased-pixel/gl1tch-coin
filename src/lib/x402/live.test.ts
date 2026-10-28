import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { BASE_MAINNET, SOLANA_MAINNET } from "./config";
import { DEPLOYER_WALLET } from "@/lib/official";

/**
 * Live check against the real PayAI facilitator (network). Skipped unless X402_LIVE=1:
 *   X402_LIVE=1 npx vitest run src/lib/x402/live.test.ts
 * No payment is made — it only asks for the 402 challenge and decodes it.
 */

const USDC_SOLANA = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const USDC_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const BASE_PAYTO = "0x" + "ab".repeat(20);

type Requirement = { scheme: string; network: string; amount: string; asset: string; payTo: string; extra?: Record<string, unknown> };
type Challenge = { x402Version: number; accepts: Requirement[]; resource: { url: string }; extensions?: Record<string, unknown> };

async function challenge(path: string): Promise<{ res: Response; body: Challenge }> {
  const { GET } = await import(`../../app/api/x402/${path.split("/")[3].split("?")[0]}/route`);
  const res: Response = await GET(new NextRequest(`https://gl1tchbased.xyz${path}`));
  const header = res.headers.get("payment-required");
  return { res, body: header ? (JSON.parse(Buffer.from(header, "base64").toString("utf8")) as Challenge) : ({} as Challenge) };
}

describe.skipIf(!process.env.X402_LIVE)("live x402 challenge (PayAI)", () => {
  beforeEach(() => {
    vi.stubEnv("X402_PAY_TO_SOLANA", DEPLOYER_WALLET);
    vi.stubEnv("X402_PAY_TO_BASE", BASE_PAYTO);
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("a bare probe (no parameters) gets a 402 with Solana and Base USDC options", async () => {
    const { res, body } = await challenge("/api/x402/scan");
    expect(res.status).toBe(402);
    expect(body.x402Version).toBe(2);
    expect(body.accepts[0]).toMatchObject({ scheme: "exact", network: SOLANA_MAINNET, amount: "10000", asset: USDC_SOLANA, payTo: DEPLOYER_WALLET });
    expect(body.accepts[0].extra?.feePayer).toBeTruthy();
    expect(body.accepts[1]).toMatchObject({ network: BASE_MAINNET, amount: "10000", payTo: BASE_PAYTO });
    expect(body.accepts[1].asset.toLowerCase()).toBe(USDC_BASE.toLowerCase());
  }, 30_000);

  it("explains itself in the unpaid body for clients that don't speak x402", async () => {
    const { res } = await challenge("/api/x402/scan");
    expect(await res.json()).toMatchObject({
      error: "payment required",
      price: "$0.01",
      docs: "https://gl1tchbased.xyz/agents/docs#x402",
      free: "https://gl1tchbased.xyz/api/scan",
    });
  }, 30_000);

  it("carries the bazaar input schema catalogs need", async () => {
    const { body } = await challenge("/api/x402/scan");
    const bazaar = body.extensions?.bazaar as { info?: { input?: Record<string, unknown> }; schema?: unknown } | undefined;
    expect(bazaar?.info?.input).toBeTruthy();
    expect(bazaar?.schema).toBeTruthy();
  }, 30_000);

  it("bad input still gets the challenge, and a repeat unpaid call is still 402 (no cache)", async () => {
    expect((await challenge("/api/x402/scan?mint=xyz")).res.status).toBe(402);
    const again = await challenge("/api/x402/scan?mint=xyz");
    expect(again.res.status).toBe(402);
    expect(again.res.headers.get("cache-control") ?? "").not.toMatch(/public|s-maxage/);
  }, 30_000);

  it("prices the deployer lookup at half a cent", async () => {
    const { body } = await challenge("/api/x402/deployer");
    expect(body.accepts[0].amount).toBe("5000");
  }, 30_000);
});
