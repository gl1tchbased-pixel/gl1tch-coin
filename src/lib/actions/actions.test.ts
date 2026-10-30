import { describe, expect, it, vi } from "vitest";
import { GET as getActionsJson, OPTIONS as optionsActionsJson } from "@/app/actions.json/route";
import { NextRequest } from "next/server";

vi.mock("@/lib/scan-report", () => ({
  runScanReport: vi.fn().mockResolvedValue({
    status: 200,
    body: {
      symbol: "GL1TCH",
      name: "GL1TCH",
      verdict: "CLEAN",
      score: 95,
      bottomLine: "Authorities revoked, liquidity 100% locked.",
    },
  }),
}));

describe("Solana Actions & Blinks", () => {
  it("serves valid actions.json with required CORS headers", async () => {
    const optRes = optionsActionsJson();
    expect(optRes.status).toBe(204);
    expect(optRes.headers.get("access-control-allow-origin")).toBe("*");
    expect(optRes.headers.get("x-action-version")).toBe("2.4");

    const getRes = getActionsJson();
    expect(getRes.status).toBe(200);
    const body = await getRes.json();
    expect(Array.isArray(body.rules)).toBe(true);
    expect(body.rules.some((r: { pathPattern: string }) => r.pathPattern === "/api/actions/**")).toBe(true);
  });

  it("returns scan action metadata", async () => {
    const { GET: getScanAction, OPTIONS: optionsScanAction } = await import("@/app/api/actions/scan/route");
    const optRes = optionsScanAction();
    expect(optRes.status).toBe(204);

    const req = new NextRequest("https://gl1tchbased.xyz/api/actions/scan");
    const getRes = await getScanAction(req);
    expect(getRes.status).toBe(200);
    const body = await getRes.json();
    expect(body.type).toBe("action");
    expect(body.title).toContain("GL1TCH");
    expect(body.links.actions.length).toBeGreaterThanOrEqual(2);
  });

  it("returns safe-swap action metadata for verified token", async () => {
    const { GET: getSafeSwapAction, OPTIONS: optionsSafeSwapAction } = await import("@/app/api/actions/safe-swap/route");
    const optRes = optionsSafeSwapAction();
    expect(optRes.status).toBe(204);

    const req = new NextRequest("https://gl1tchbased.xyz/api/actions/safe-swap");
    const getRes = await getSafeSwapAction(req);
    expect(getRes.status).toBe(200);
    const body = await getRes.json();
    expect(body.type).toBe("action");
    expect(body.title).toContain("Safe Swap");
    expect(body.links.actions.some((a: { label: string }) => a.label === "0.1 SOL")).toBe(true);
  });
});
