import { describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { SentinelStore } from "./store.js";

function tmpFile(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gl1tch-sentinel-"));
  return path.join(dir, "sentinel.json");
}

describe("SentinelStore", () => {
  it("manages subscriptions and expiration", () => {
    const store = new SentinelStore(tmpFile());
    expect(store.isSubscribed(1001)).toBe(false);

    store.addSubscriber({
      userId: 1001,
      username: "alpha_trader",
      plan: "holder",
      subscribedAt: Date.now(),
      expiresAt: Date.now() + 86_400_000,
    });

    expect(store.isSubscribed(1001)).toBe(true);
    expect(store.getSubscriber(1001)?.plan).toBe("holder");

    // Expired subscriber
    store.addSubscriber({
      userId: 1002,
      username: "expired_trader",
      plan: "stars",
      subscribedAt: Date.now() - 100_000,
      expiresAt: Date.now() - 10_000,
    });
    expect(store.isSubscribed(1002)).toBe(false);
  });

  it("records unique gem alerts and de-duplicates within 24h", () => {
    const store = new SentinelStore(tmpFile());
    const a1 = {
      mint: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
      symbol: "BONK",
      name: "Bonk",
      score: 95,
      verdict: "CLEAN",
      lpLockedPct: 100,
      alertedAt: Date.now(),
    };

    expect(store.recordAlert(a1)).toBe(true);
    expect(store.recordAlert(a1)).toBe(false); // duplicate rejected
    expect(store.getRecentGems()).toHaveLength(1);
  });
});

