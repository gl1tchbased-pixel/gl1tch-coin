import { describe, it, expect } from "vitest";
import { StatsStore } from "./stats.js";

describe("StatsStore", () => {
  it("keeps user and automated scans apart from the first tagged bump", () => {
    const s = new StatsStore();
    s.bump(false, 1, 0, undefined, 1_000); // an untagged bump from an older site deploy
    s.bump(true, 1, 0, "user", 2_000);
    s.bump(false, 12, 3, "auto", 3_000);
    expect(s.get()).toEqual({ scanned: 14, flagged: 4, user: 1, auto: 12, splitSince: 2_000 });
  });

  it("ignores an unknown kind instead of creating a new counter", () => {
    const s = new StatsStore();
    s.bump(false, 2, 0, "bogus" as never);
    expect(s.get()).toMatchObject({ scanned: 2, user: 0, auto: 0, splitSince: null });
  });
});
