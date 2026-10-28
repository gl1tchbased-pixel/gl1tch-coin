import { describe, it, expect } from "vitest";
import { facilitatorConfigs } from "./facilitators";

describe("facilitatorConfigs — who verifies and settles payments", () => {
  it("uses PayAI alone without Coinbase keys (no signup needed)", () => {
    expect(facilitatorConfigs({}).map((c) => c.url)).toEqual(["https://facilitator.payai.network"]);
  });

  it("puts Coinbase first when its keys are set (settling through it lists us in the Bazaar), PayAI as fallback", () => {
    const urls = facilitatorConfigs({ CDP_API_KEY_ID: "id", CDP_API_KEY_SECRET: "secret" }).map((c) => c.url);
    expect(urls).toEqual(["https://api.cdp.coinbase.com/platform/v2/x402", "https://facilitator.payai.network"]);
  });

  it("ignores half a Coinbase key pair", () => {
    expect(facilitatorConfigs({ CDP_API_KEY_ID: "id" })).toHaveLength(1);
    expect(facilitatorConfigs({ CDP_API_KEY_SECRET: " " , CDP_API_KEY_ID: "id" })).toHaveLength(1);
  });
});
