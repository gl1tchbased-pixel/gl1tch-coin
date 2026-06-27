import { describe, it, expect } from "vitest";
import { ActivityTracker, dayKey } from "./activity.js";

describe("dayKey", () => {
  it("formats a timestamp as YYYY-MM-DD in the given timezone", () => {
    expect(dayKey(Date.parse("2026-05-31T12:00:00Z"), "UTC")).toBe("2026-05-31");
  });
});

describe("ActivityTracker", () => {
  it("counts messages and dedupes posters", () => {
    const t = new ActivityTracker("UTC", () => Date.parse("2026-05-29T10:00:00Z"));
    t.recordMessage(1);
    t.recordMessage(1);
    t.recordMessage(2);
    const s = t.snapshot();
    expect(s.messages).toBe(3);
    expect(s.uniquePosters).toBe(2);
  });

  it("counts new members", () => {
    const t = new ActivityTracker("UTC", () => Date.parse("2026-05-29T10:00:00Z"));
    t.recordJoin();
    t.recordJoin();
    expect(t.snapshot().newMembers).toBe(2);
  });

  it("resets counters when the day rolls over", () => {
    let now = Date.parse("2026-05-29T10:00:00Z");
    const t = new ActivityTracker("UTC", () => now);
    t.recordMessage(1);
    t.recordJoin();
    expect(t.snapshot().messages).toBe(1);

    now = Date.parse("2026-05-30T01:00:00Z"); // next UTC day
    const s = t.snapshot();
    expect(s.date).toBe("2026-05-30");
    expect(s.messages).toBe(0);
    expect(s.newMembers).toBe(0);
  });
});
