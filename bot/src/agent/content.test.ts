import { describe, it, expect } from "vitest";
import { computeDayNumber, generateDailyPost } from "./content.js";
import type { DailyStats } from "./activity.js";

const stats: DailyStats = { date: "2026-05-31", messages: 1204, uniquePosters: 87, newMembers: 47 };

describe("computeDayNumber", () => {
  it("is 1 on the start date", () => {
    expect(computeDayNumber("2026-05-29", Date.parse("2026-05-29T12:00:00Z"), "UTC")).toBe(1);
  });

  it("increments by whole days", () => {
    expect(computeDayNumber("2026-05-29", Date.parse("2026-05-31T12:00:00Z"), "UTC")).toBe(3);
  });

  it("never goes below 1", () => {
    expect(computeDayNumber("2026-05-29", Date.parse("2026-05-20T12:00:00Z"), "UTC")).toBe(1);
  });
});

describe("generateDailyPost", () => {
  it("keeps the X post within 280 characters", () => {
    for (let day = 1; day <= 14; day++) {
      expect(generateDailyPost(stats, day).x.length).toBeLessThanOrEqual(280);
    }
  });

  it("varies content across days (X rejects duplicates)", () => {
    const a = generateDailyPost(stats, 1).x;
    const b = generateDailyPost(stats, 2).x;
    expect(a).not.toBe(b);
  });

  it("embeds the day's stats when there is activity", () => {
    const post = generateDailyPost(stats, 1);
    expect(post.x).toContain("47"); // +47 nodes joined
    expect(post.x).toContain("1,204"); // signals transmitted, grouped
  });

  it("uses grammatical singular/plural", () => {
    const quiet: DailyStats = { date: "x", messages: 1, uniquePosters: 1, newMembers: 1 };
    const post = generateDailyPost(quiet, 1);
    expect(post.x).toContain("1 node joined"); // singular
    expect(post.x).toContain("1 signal transmitted"); // singular
    expect(post.x).not.toContain("1 signals");
  });

  it("falls back to brand messaging on a fully quiet day", () => {
    const empty: DailyStats = { date: "x", messages: 0, uniquePosters: 0, newMembers: 0 };
    const post = generateDailyPost(empty, 1);
    expect(post.x).toContain("Zero tax"); // evergreen line, not an empty stat line
  });

  it("produces Telegram HTML with a branded closer", () => {
    const tg = generateDailyPost(stats, 1).telegram;
    expect(tg).toContain("<b>");
    expect(tg).toContain("$GL1TCH");
  });
});
