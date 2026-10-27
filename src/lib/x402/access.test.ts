import { describe, it, expect } from "vitest";
import { accessMode } from "./access";

const base = { configured: true, inputError: null, limited: false, holder: false };

describe("accessMode — what a request to a paid route gets, in order", () => {
  it("says unconfigured before anything else (never a 402 with nothing to pay)", () => {
    expect(accessMode({ configured: false, inputError: "bad", limited: true, holder: true })).toBe("unconfigured");
  });

  it("rejects bad input before rate limits or payment, so no one pays for a typo", () => {
    expect(accessMode({ ...base, inputError: "invalid address", limited: true, holder: true })).toBe("invalid");
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
});
