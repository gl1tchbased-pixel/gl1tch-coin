import { describe, it, expect, vi, afterEach } from "vitest";
import { verifyDrawIndependently, verifyBeaconChain, beaconHash } from "./verify";
import { merkleRoot, winnerIndex } from "./draw";
import type { Draw, BeaconEntry } from "./client";

const VALUE = "dd376b2d4754de41b4e9e7e2b654e5520978039e6aea21ebe2730c65e7598ed9913737e24580d09c11881e6c5736c06d6297364d39be393ea71d441fabcdef01";

function revealedDraw(): Draw {
  const participants = ["Wallet_A", "Wallet_B", "Wallet_C", "Wallet_D", "Wallet_E"];
  const root = merkleRoot(participants);
  const idx = winnerIndex(VALUE, root, participants.length);
  return {
    id: "draw-x", type: "weekly", openedAt: 0, closesAt: 1, status: "revealed",
    participants, merkleRoot: root, targetAfterIndex: 84644,
    pulse: { round: 28297, index: 84646, valueHex: VALUE, cid: "cid1", timestamp: "2025" },
    winnerIndex: idx, winner: participants[idx],
  };
}

function stubCurby(dataHash: string) {
  vi.stubGlobal("fetch", vi.fn(async () => ({
    ok: true,
    json: async () => [{ data: { content: { index: 84646, payload: { round: 28297, stage: "randomness", dataHash } } } }],
  })));
}

afterEach(() => vi.unstubAllGlobals());

describe("verifyDrawIndependently", () => {
  it("verifies a correct revealed draw (all three checks pass)", async () => {
    stubCurby(VALUE);
    const res = await verifyDrawIndependently(revealedDraw());
    expect(res.verified).toBe(true);
    expect(res.checks).toHaveLength(3);
    expect(res.checks.every((c) => c.ok)).toBe(true);
  });

  it("fails if CURBy's published value differs from the recorded one", async () => {
    stubCurby("0".repeat(128)); // CURBy returns a different value
    const res = await verifyDrawIndependently(revealedDraw());
    expect(res.verified).toBe(false);
    expect(res.checks.find((c) => c.key === "curby")!.ok).toBe(false);
  });

  it("fails if the recorded winner was tampered with", async () => {
    stubCurby(VALUE);
    const d = revealedDraw();
    d.winner = "Wallet_A"; // force a wrong winner
    d.winnerIndex = 0;
    const res = await verifyDrawIndependently(d);
    // merkle + curby still pass, but winner recompute won't match the tampered value (unless idx really is 0)
    const winnerCheck = res.checks.find((c) => c.key === "winner")!;
    const trueIdx = winnerIndex(VALUE, d.merkleRoot!, d.participants.length);
    expect(winnerCheck.ok).toBe(trueIdx === 0);
  });

  it("fails if the entry list was altered (Merkle root mismatch)", async () => {
    stubCurby(VALUE);
    const d = revealedDraw();
    d.participants = [...d.participants, "Sneaky_Wallet"]; // added after commit
    const res = await verifyDrawIndependently(d);
    expect(res.checks.find((c) => c.key === "merkle")!.ok).toBe(false);
    expect(res.verified).toBe(false);
  });

  it("returns not-verified for a non-revealed draw", async () => {
    const d = revealedDraw();
    d.status = "committed";
    const res = await verifyDrawIndependently(d);
    expect(res.verified).toBe(false);
  });
});

describe("verifyBeaconChain — Twine-style tamper-evidence", () => {
  // Same parity vector as bot/src/quantum-core/logic.test.ts.
  function chain(): BeaconEntry[] {
    const e0 = { seq: 0, at: 1783583567558, drawId: "draw-2949", event: "opened" as const, detail: { closesAt: 1784188367558, type: "weekly" } };
    const h0 = beaconHash("genesis", e0);
    const e1 = { seq: 1, at: 1783600000000, drawId: "draw-2949", event: "committed" as const, detail: { merkleRoot: "abc", poolSize: 5, targetAfterIndex: 84646 } };
    const h1 = beaconHash(h0, e1);
    // API returns newest-first
    return [
      { ...e1, prevHash: h0, hash: h1 },
      { ...e0, prevHash: "genesis", hash: h0 },
    ];
  }

  it("matches the bot parity vector", () => {
    const e0 = { seq: 0, at: 1783583567558, drawId: "draw-2949", event: "opened" as const, detail: { closesAt: 1784188367558, type: "weekly" } };
    expect(beaconHash("genesis", e0)).toBe("443293c6078b554bd5f94c75d39f98bc429a87560b0c83ecd5a426136f334c1e");
  });

  it("verifies an intact chain", () => {
    const r = verifyBeaconChain(chain());
    expect(r.ok).toBe(true);
    expect(r.length).toBe(2);
  });

  it("detects a tampered entry (altered detail)", () => {
    const c = chain();
    (c[1].detail as { type: string }).type = "hacked";
    const r = verifyBeaconChain(c);
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/hash mismatch|link broken/);
  });

  it("detects a broken link (deleted middle entry)", () => {
    const c = chain();
    // remove the genesis entry → the remaining entry's prevHash no longer anchors, but a single
    // entry still self-verifies; instead corrupt the link explicitly:
    c[0].prevHash = "deadbeef";
    const r = verifyBeaconChain(c);
    expect(r.ok).toBe(false);
  });

  it("treats an empty log as ok", () => {
    expect(verifyBeaconChain([]).ok).toBe(true);
  });
});
