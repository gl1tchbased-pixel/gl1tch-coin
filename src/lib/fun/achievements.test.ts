import { beforeEach, describe, expect, it } from "vitest";
import { ACHIEVEMENT_IDS, unlock, unlockedAchievements, _resetAchievements } from "./achievements";

describe("achievements", () => {
  beforeEach(() => _resetAchievements());

  it("has the five badges", () => {
    expect(ACHIEVEMENT_IDS).toEqual(["scan", "hunter", "perfect", "collector", "secret"]);
  });

  it("unlocks once and keeps working without storage", () => {
    expect(unlock("scan")).toBe(true);
    expect(unlock("scan")).toBe(false);
    expect(unlock("secret")).toBe(true);
    expect(unlockedAchievements()).toEqual(["scan", "secret"]);
  });
});
