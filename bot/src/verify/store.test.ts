import { describe, it, expect } from "vitest";
import { VerifyStore } from "./store.js";

describe("VerifyStore nonces", () => {
  it("issues and consumes a nonce exactly once", () => {
    const s = new VerifyStore();
    const nonce = s.issueNonce(42, "ghost");
    const rec = s.consumeNonce(nonce);
    expect(rec?.tgUserId).toBe(42);
    expect(rec?.tgUsername).toBe("ghost");
    expect(s.consumeNonce(nonce)).toBeNull(); // single-use
  });

  it("returns null for an unknown nonce", () => {
    const s = new VerifyStore();
    expect(s.consumeNonce("nope")).toBeNull();
  });

  it("expires nonces past the TTL", () => {
    let t = 1_000;
    const s = new VerifyStore({ ttlMs: 100, now: () => t });
    const nonce = s.issueNonce(7);
    t = 1_201; // > 100ms later
    expect(s.consumeNonce(nonce)).toBeNull();
  });
});

describe("VerifyStore verifications", () => {
  it("stores and reads the latest verification per user", () => {
    const s = new VerifyStore();
    s.setVerification({ tgUserId: 1, wallet: "W", tierId: "core", balance: 6_000_000, verifiedAt: 0 });
    expect(s.getVerification(1)?.tierId).toBe("core");
    s.setVerification({ tgUserId: 1, wallet: "W", tierId: "ghost", balance: 11_000_000, verifiedAt: 1 });
    expect(s.getVerification(1)?.tierId).toBe("ghost");
  });

  it("round-trips through export/import", () => {
    const a = new VerifyStore();
    a.setVerification({ tgUserId: 9, wallet: "W", tierId: "infected", balance: 100_000, verifiedAt: 0 });
    const b = new VerifyStore();
    b.importVerifications(a.exportVerifications());
    expect(b.getVerification(9)?.tierId).toBe("infected");
  });
});
