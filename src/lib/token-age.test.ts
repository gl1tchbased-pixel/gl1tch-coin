import { describe, it, expect } from "vitest";
import { capVerdictForAge, tokenAgeCheck } from "./token-age";

describe("tokenAgeCheck", () => {
  it("warns on a token under 24 hours old", () => {
    expect(tokenAgeCheck(0)).toMatchObject({ status: "warn", value: "< 24 hours" });
  });
  it("passes older tokens and says how old", () => {
    expect(tokenAgeCheck(1)).toMatchObject({ status: "pass", value: "1 day" });
    expect(tokenAgeCheck(3).explain).toMatch(/still young/);
    expect(tokenAgeCheck(144)).toMatchObject({ status: "pass", value: "144 days" });
  });
  it("is unknown when the age can't be read", () => {
    expect(tokenAgeCheck(null).status).toBe("unknown");
    expect(tokenAgeCheck(Number.NaN).status).toBe("unknown");
  });
});

describe("capVerdictForAge", () => {
  it("never lets a token under 24 hours read CLEAN", () => {
    expect(capVerdictForAge("CLEAN", 0)).toBe("LOW RISK");
  });
  it("never lets a token with no readable trading history read CLEAN", () => {
    expect(capVerdictForAge("CLEAN", null)).toBe("LOW RISK");
  });
  it("leaves other verdicts and older tokens alone", () => {
    expect(capVerdictForAge("CLEAN", 1)).toBe("CLEAN");
    expect(capVerdictForAge("HIGH RISK", 0)).toBe("HIGH RISK");
    expect(capVerdictForAge("LOW RISK", null)).toBe("LOW RISK");
  });
});
