import { describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { GuardianStore, FREE_DAILY_GROUP_SCANS } from "./store.js";

function tmpFile(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gl1tch-guardian-"));
  return path.join(dir, "guardian.json");
}

describe("GuardianStore", () => {
  it("allows up to FREE_DAILY_GROUP_SCANS per UTC day and notifies once when exceeded", () => {
    const store = new GuardianStore(tmpFile());
    const now = Date.UTC(2026, 9, 30, 12, 0, 0);

    for (let i = 1; i <= FREE_DAILY_GROUP_SCANS; i++) {
      const r = store.checkAndRecordAutoScan("-100999", [], now);
      expect(r.allowed).toBe(true);
      expect(r.usedToday).toBe(i);
      expect(r.shouldNotifyLimit).toBe(false);
    }

    const blocked1 = store.checkAndRecordAutoScan("-100999", [], now);
    expect(blocked1.allowed).toBe(false);
    expect(blocked1.shouldNotifyLimit).toBe(true);

    const blocked2 = store.checkAndRecordAutoScan("-100999", [], now);
    expect(blocked2.allowed).toBe(false);
    expect(blocked2.shouldNotifyLimit).toBe(false);
  });

  it("grants unlimited scans when unlocked by a verified $GL1TCH holder admin", () => {
    const file = tmpFile();
    const store = new GuardianStore(file);
    const now = Date.UTC(2026, 9, 30, 12, 0, 0);

    for (let i = 0; i < FREE_DAILY_GROUP_SCANS; i++) {
      store.checkAndRecordAutoScan("-100888", [], now);
    }
    expect(store.checkAndRecordAutoScan("-100888", [], now).allowed).toBe(false);

    store.unlockGroup("-100888", {
      userId: 42,
      username: "@holder_admin",
      tierId: "infected",
      balance: 250_000,
    });

    const reloaded = new GuardianStore(file);
    const after = reloaded.checkAndRecordAutoScan("-100888", [], now);
    expect(after.allowed).toBe(true);
    expect(after.unlimited).toBe(true);
    expect(after.unlockedByUsername).toBe("@holder_admin");
  });

  it("always allows official GL1TCH groups without limits", () => {
    const store = new GuardianStore(tmpFile());
    const st = store.getStatus("-100111", ["-100111"]);
    expect(st.unlimited).toBe(true);
    expect(st.official).toBe(true);
  });
});

