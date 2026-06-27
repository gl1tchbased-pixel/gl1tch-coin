import { describe, it, expect, vi } from "vitest";
import { VerifyStore } from "./store.js";
import { handleVerification, type VerifyDeps } from "./flow.js";

function freshNonce(store: VerifyStore, userId = 100) {
  return store.issueNonce(userId);
}

const baseDeps = (over: Partial<VerifyDeps> = {}): VerifyDeps => ({
  verify: () => true,
  readBalance: async () => 0,
  contractLive: true,
  ...over,
});

describe("handleVerification", () => {
  it("resolves the tier from balance and records the verification", async () => {
    const store = new VerifyStore();
    const nonce = freshNonce(store, 100);
    const grantAccess = vi.fn(async () => ["<b>Ghost Node</b>: t.me/+x"]);
    const res = await handleVerification(
      store,
      baseDeps({ readBalance: async () => 12_000_000, grantAccess }),
      { nonce, publicKey: "PK", signature: "SIG" }
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.rank).toBe("Ghost Node");
    expect(res.tierId).toBe("ghost");
    expect(res.invites).toHaveLength(1);
    expect(store.getVerification(100)?.tierId).toBe("ghost");
    expect(grantAccess).toHaveBeenCalledWith(100, ["observer", "infected", "bearer", "core", "ghost"]);
  });

  it("rejects an unknown/expired nonce before checking anything else", async () => {
    const store = new VerifyStore();
    const verify = vi.fn(() => true);
    const res = await handleVerification(store, baseDeps({ verify }), {
      nonce: "missing",
      publicKey: "PK",
      signature: "SIG",
    });
    expect(res).toEqual({ ok: false, error: "invalid_or_expired_nonce" });
    expect(verify).not.toHaveBeenCalled();
  });

  it("rejects a bad signature without reading balance", async () => {
    const store = new VerifyStore();
    const nonce = freshNonce(store);
    const readBalance = vi.fn(async () => 999);
    const res = await handleVerification(
      store,
      baseDeps({ verify: () => false, readBalance }),
      { nonce, publicKey: "PK", signature: "SIG" }
    );
    expect(res).toEqual({ ok: false, error: "bad_signature" });
    expect(readBalance).not.toHaveBeenCalled();
  });

  it("treats users as Observer pre-launch and never reads balance", async () => {
    const store = new VerifyStore();
    const nonce = freshNonce(store);
    const readBalance = vi.fn(async () => 5_000_000);
    const res = await handleVerification(
      store,
      baseDeps({ contractLive: false, readBalance }),
      { nonce, publicKey: "PK", signature: "SIG" }
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.tierId).toBe("observer");
    expect(res.preLaunch).toBe(true);
    expect(readBalance).not.toHaveBeenCalled();
  });

  it("makes a nonce single-use even on success", async () => {
    const store = new VerifyStore();
    const nonce = freshNonce(store);
    const deps = baseDeps();
    await handleVerification(store, deps, { nonce, publicKey: "PK", signature: "SIG" });
    const second = await handleVerification(store, deps, { nonce, publicKey: "PK", signature: "SIG" });
    expect(second).toEqual({ ok: false, error: "invalid_or_expired_nonce" });
  });
});
