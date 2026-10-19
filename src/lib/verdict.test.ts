import { describe, it, expect } from "vitest";
import { verdictKind } from "./verdict";

describe("verdictKind", () => {
  it("maps every scanner verdict to a reaction", () => {
    expect(verdictKind("CLEAN")).toBe("ok");
    expect(verdictKind("LOW RISK")).toBe("ok");
    expect(verdictKind("CAUTION")).toBe("warn");
    expect(verdictKind("UNKNOWN")).toBe("warn");
    expect(verdictKind("HIGH RISK")).toBe("bad");
    expect(verdictKind("RUG-SHAPED")).toBe("bad");
  });
  it("never treats an unexpected verdict as clean", () => {
    expect(verdictKind("")).toBe("warn");
    expect(verdictKind("something new")).toBe("warn");
  });
});
