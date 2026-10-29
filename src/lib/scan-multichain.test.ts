import { describe, it, expect } from "vitest";
import { GOPLUS_CHAIN, CHAIN_LABEL } from "./scan-multichain";

describe("scanner chain map", () => {
  it("scans Robinhood Chain through GoPlus (chain id 4663, DexScreener id robinhood)", () => {
    expect(GOPLUS_CHAIN.robinhood).toBe("4663");
    expect(CHAIN_LABEL.robinhood).toBe("Robinhood Chain");
  });

  it("labels every chain it can scan", () => {
    for (const chain of Object.keys(GOPLUS_CHAIN)) expect(CHAIN_LABEL[chain], chain).toBeTruthy();
  });
});
