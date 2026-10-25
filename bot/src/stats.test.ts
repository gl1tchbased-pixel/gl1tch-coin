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

  it("restarts the split once when the counting rules change, keeping the all-time total", () => {
    const s = new StatsStore();
    s.bump(false, 5, 0, "user", 1_000);
    s.bump(false, 7, 0, "auto", 2_000);
    s.bump(false, 1, 0, "auto", 3_000, 2); // first bump under the new rules
    s.bump(false, 1, 0, "user", 4_000, 2);
    s.bump(false, 2, 0, "user", 5_000); // a straggler from the old deploy doesn't restart it again
    expect(s.get()).toEqual({ scanned: 16, flagged: 0, user: 3, auto: 1, splitSince: 3_000 });
  });

  it("ignores an unknown kind instead of creating a new counter", () => {
    const s = new StatsStore();
    s.bump(false, 2, 0, "bogus" as never);
    expect(s.get()).toMatchObject({ scanned: 2, user: 0, auto: 0, splitSince: null });
  });
});
