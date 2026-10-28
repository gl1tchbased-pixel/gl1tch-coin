import { describe, it, expect } from "vitest";
import { accessMode } from "./access";

const base = { configured: true, limited: false, holder: false };

describe("accessMode — what a request to a paid route gets, in order", () => {
  it("says unconfigured before anything else (never a 402 with nothing to pay)", () => {
    expect(accessMode({ configured: false, limited: true, holder: true })).toBe("unconfigured");
  });

  it("rate-limits before payment", () => {
    expect(accessMode({ ...base, limited: true, holder: true })).toBe("limited");
  });

  it("lets a $GL1TCH key holder through without paying", () => {
    expect(accessMode({ ...base, holder: true })).toBe("holder");
  });

  it("asks everyone else to pay", () => {
    expect(accessMode(base)).toBe("paid");
  });

  it("never lets input validity block the challenge (x402scan probes without parameters)", () => {
    const withInputError = { ...base, inputError: "invalid address" } as Parameters<typeof accessMode>[0];
    expect(accessMode(withInputError)).toBe("paid");
  });
});
