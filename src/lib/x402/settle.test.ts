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
    expect(settleInputFromContext(ctx)).toEqual({ result, requirementsAmount: "5000", resourceUrl: "/api/x402/deployer", selfTest: false });
  });

  it("falls back to the payload's resource URL when there is no transport context", () => {
    const ctx = { result, requirements: { amount: "10000" }, paymentPayload: { resource: { url: "https://gl1tchbased.xyz/api/x402/scan" } } };
    expect(settleInputFromContext(ctx)?.resourceUrl).toBe("https://gl1tchbased.xyz/api/x402/scan");
  });

  it("flags our own test calls by their x-gl1tch-self-test header, even when the payer is missing", () => {
    const adapter = { getHeader: (n: string) => (n.toLowerCase() === "x-gl1tch-self-test" ? "1" : undefined) };
    const ctx = { result: { ...result, payer: undefined }, requirements: { amount: "10000" }, transportContext: { request: { path: "/api/x402/scan", adapter } } };
    expect(settleInputFromContext(ctx)?.selfTest).toBe(true);
    const plain = { result, requirements: { amount: "10000" }, transportContext: { request: { path: "/api/x402/scan", adapter: { getHeader: () => undefined } } } };
    expect(settleInputFromContext(plain)?.selfTest).toBe(false);
  });

  it("returns null without a settlement result", () => {
    expect(settleInputFromContext({ requirements: { amount: "1" } })).toBeNull();
    expect(settleInputFromContext(null)).toBeNull();
  });
});
