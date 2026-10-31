import { describe, it, expect } from "vitest";
import { WebacyClient } from "./webacy";

describe("WebacyClient", () => {
  it("reports pending status gracefully when no API key is provided", async () => {
    const client = new WebacyClient({ apiKey: "" });
    expect(client.isConfigured()).toBe(false);

    const result = await client.checkThreat("3HQJwwHvzy8pGkPqGQcb4thZCH88MUCHVVSNtHn6pump", "solana");
    expect(result.enabled).toBe(false);
    expect(result.provider).toBe("webacy");
    expect(result.reason).toContain("pending Startup Accelerator Grant");
  });

  it("initializes configured client with custom credentials", () => {
    const client = new WebacyClient({ apiKey: "test_key_123", baseUrl: "https://custom.api.webacy.com" });
    expect(client.isConfigured()).toBe(true);
  });
});

