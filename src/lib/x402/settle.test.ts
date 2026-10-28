import { describe, it, expect } from "vitest";
import { settleInputFromContext } from "./settle";

const result = { success: true, transaction: "tx", network: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp", payer: "P" };

describe("settleInputFromContext — x402 after-settle hook context → ledger input", () => {
  it("takes the route from the server-side request path, not the client-supplied resource", () => {
    const ctx = {
      result,
      requirements: { amount: "5000" },
      paymentPayload: { resource: { url: "https://gl1tchbased.xyz/api/x402/scan" } },
      transportContext: { request: { path: "/api/x402/deployer" } },
    };
    expect(settleInputFromContext(ctx)).toEqual({ result, requirementsAmount: "5000", resourceUrl: "/api/x402/deployer" });
  });

  it("falls back to the payload's resource URL when there is no transport context", () => {
    const ctx = { result, requirements: { amount: "10000" }, paymentPayload: { resource: { url: "https://gl1tchbased.xyz/api/x402/scan" } } };
    expect(settleInputFromContext(ctx)?.resourceUrl).toBe("https://gl1tchbased.xyz/api/x402/scan");
  });

  it("returns null without a settlement result", () => {
    expect(settleInputFromContext({ requirements: { amount: "1" } })).toBeNull();
    expect(settleInputFromContext(null)).toBeNull();
  });
});
