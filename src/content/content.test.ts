import { describe, it, expect } from "vitest";
import { HERO, dashboardGroups, SIGNAL_HEALTH, CONCENTRATION } from "./dashboard";
import { RANK_TIERS } from "@/lib/ranks";
import { OFFICIAL } from "@/lib/official";
// Bot duplicates official links + the rank ladder; these must not drift.
import { OFFICIAL as BOT_OFFICIAL, ranks as botRanks } from "../../bot/src/content";
import { RANK_TIERS as BOT_TIERS } from "../../bot/src/ranks";
import { verificationMessage as botMessage } from "../../bot/src/verify/message";
import { verificationMessage as siteMessage } from "@/lib/verify";

describe("dashboard data", () => {
  it("has unique hero ids", () => {
    const ids = HERO.map((h) => h.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has well-formed metrics across all groups", () => {
    const ids = new Set<string>();
    for (const group of dashboardGroups) {
      for (const m of group.metrics) {
        expect(m.spark.length).toBeGreaterThan(1);
        expect(["up", "down", "flat"]).toContain(m.trend);
        expect(ids.has(m.id)).toBe(false);
        ids.add(m.id);
      }
    }
  });

  it("keeps health factor percentages within 0..100", () => {
    for (const f of SIGNAL_HEALTH.factors) {
      expect(f.value).toBeGreaterThanOrEqual(0);
      expect(f.value).toBeLessThanOrEqual(100);
    }
    expect(SIGNAL_HEALTH.score).toBeGreaterThanOrEqual(0);
    expect(SIGNAL_HEALTH.score).toBeLessThanOrEqual(100);
  });

  it("defines a positive whale threshold", () => {
    expect(CONCENTRATION.whaleThreshold).toBeGreaterThan(0);
  });
});

describe("cross-surface consistency (single source of truth)", () => {
  it("bot official links match the website", () => {
    expect(BOT_OFFICIAL.X).toBe(OFFICIAL.X_URL);
    expect(BOT_OFFICIAL.TG).toBe(OFFICIAL.TG_URL);
    expect(BOT_OFFICIAL.SITE).toBe(OFFICIAL.SITE_URL);
  });

  it("bot rank ladder names match the website tiers in order", () => {
    expect(botRanks.map((r) => r.rank)).toEqual(RANK_TIERS.map((t) => t.rank));
  });

  it("bot numeric rank thresholds match the website tiers exactly", () => {
    expect(BOT_TIERS.map((t) => [t.id, t.min])).toEqual(
      RANK_TIERS.map((t) => [t.id, t.min])
    );
  });

  it("the wallet-signing message is byte-identical across bot and website", () => {
    expect(botMessage("nonce-xyz")).toBe(siteMessage("nonce-xyz"));
  });
});
