import { describe, it, expect } from "vitest";
import {
  merkleRoot,
  winnerIndex,
  openDraw,
  freezeCommit,
  revealDraw,
  drawIdForPeriod,
  beaconHash,
  type Draw,
  type DrawPulse,
} from "./logic.js";

// Cross-package parity vector — MUST match src/lib/quantum/draw.ts exactly.
// Computed independently; both site and bot implementations must reproduce it.
const PARTS = ["alice", "bob", "carol", "dave", "erin"];
const PULSE = "dd376b2d4754de41b4e9e7e2b654e5520978039e6aea21ebe2730c65e7598ed9913737e24580d09c11881e6c5736c06d6297364d39be393ea71d441fabcdef01";
const EXPECT_ROOT = "4d439dee017eea04ff3ee2ca195261628906599c92b24ee57f8b5f372b76ed06";
const EXPECT_WINNER_INDEX = 0;

describe("logic — parity with site draw.ts", () => {
  it("reproduces the merkle root vector", () => {
    expect(merkleRoot(PARTS)).toBe(EXPECT_ROOT);
  });
  it("reproduces the winner index vector", () => {
    expect(winnerIndex(PULSE, EXPECT_ROOT, PARTS.length)).toBe(EXPECT_WINNER_INDEX);
  });
  it("winner is deterministic and in range", () => {
    expect(winnerIndex(PULSE, EXPECT_ROOT, PARTS.length)).toBe(winnerIndex(PULSE, EXPECT_ROOT, PARTS.length));
    const i = winnerIndex(PULSE, EXPECT_ROOT, PARTS.length);
    expect(i).toBeGreaterThanOrEqual(0);
    expect(i).toBeLessThan(PARTS.length);
  });
});

const mkOpen = (now: number, windowMs: number): Draw => openDraw(drawIdForPeriod(now, windowMs), "weekly", now, windowMs).draw;

describe("logic — commit-reveal lifecycle", () => {
  const WINDOW = 1000;

  it("freezeCommit does nothing before the window closes", () => {
    const d = mkOpen(0, WINDOW);
    d.participants.push("w1");
    expect(freezeCommit(d, 500, 100)).toBeNull();
  });

  it("freezeCommit freezes the root and targets a future index", () => {
    const d = mkOpen(0, WINDOW);
    d.participants.push("w1", "w2", "w3");
    const t = freezeCommit(d, WINDOW, 84646)!;
    expect(t.draw.status).toBe("committed");
    expect(t.draw.merkleRoot).toBe(merkleRoot(["w1", "w2", "w3"]));
    expect(t.draw.targetAfterIndex).toBe(84646);
    expect(t.beacon.event).toBe("committed");
  });

  it("freezeCommit voids an empty window", () => {
    const d = mkOpen(0, WINDOW);
    const t = freezeCommit(d, WINDOW, 84646)!;
    expect(t.draw.status).toBe("void");
    expect(t.beacon.detail.reason).toBe("no_participants");
  });

  it("revealDraw defers when the pulse does not post-date the commitment", () => {
    const d = mkOpen(0, WINDOW);
    d.participants.push("w1", "w2");
    const committed = freezeCommit(d, WINDOW, 84646)!.draw;
    const stalePulse: DrawPulse = { round: 1, index: 84646, valueHex: PULSE, cid: "c", timestamp: "t" };
    expect(revealDraw(committed, stalePulse, WINDOW + 10)).toBeNull(); // index not > target
  });

  it("revealDraw computes a recomputable winner from a future pulse", () => {
    const d = mkOpen(0, WINDOW);
    d.participants.push("w1", "w2", "w3", "w4");
    const committed = freezeCommit(d, WINDOW, 84646)!.draw;
    const pulse: DrawPulse = { round: 2, index: 84650, valueHex: PULSE, cid: "cid1", timestamp: "2025" };
    const t = revealDraw(committed, pulse, WINDOW + 100)!;
    expect(t.draw.status).toBe("revealed");
    expect(t.draw.winner).toBe(committed.participants[winnerIndex(PULSE, committed.merkleRoot!, 4)]);
    expect(t.beacon.detail.recompute).toContain("sha256");
    // independently recompute
    const recomputed = winnerIndex(pulse.valueHex, committed.merkleRoot!, 4);
    expect(t.draw.winnerIndex).toBe(recomputed);
  });

  it("revealDraw does not re-reveal an already-revealed draw", () => {
    const d = mkOpen(0, WINDOW);
    d.participants.push("a", "b");
    const committed = freezeCommit(d, WINDOW, 1)!.draw;
    const pulse: DrawPulse = { round: 2, index: 5, valueHex: PULSE, cid: "c", timestamp: "t" };
    const revealed = revealDraw(committed, pulse, 2)!.draw;
    expect(revealDraw(revealed, pulse, 3)).toBeNull();
  });

  it("drawIdForPeriod is stable within a period and advances across periods", () => {
    expect(drawIdForPeriod(500, 1000)).toBe(drawIdForPeriod(999, 1000));
    expect(drawIdForPeriod(500, 1000)).not.toBe(drawIdForPeriod(1500, 1000));
  });
});

describe("logic — beacon hash chain (parity vector, must match site verify.ts)", () => {
  const e0 = { seq: 0, at: 1783583567558, drawId: "draw-2949", event: "opened" as const, detail: { closesAt: 1784188367558, type: "weekly" } };
  const e1 = { seq: 1, at: 1783600000000, drawId: "draw-2949", event: "committed" as const, detail: { merkleRoot: "abc", poolSize: 5, targetAfterIndex: 84646 } };
  it("reproduces the genesis-linked hash vector", () => {
    expect(beaconHash("genesis", e0)).toBe("443293c6078b554bd5f94c75d39f98bc429a87560b0c83ecd5a426136f334c1e");
  });
  it("reproduces the linked second-entry hash vector", () => {
    const h0 = beaconHash("genesis", e0);
    expect(beaconHash(h0, e1)).toBe("0838e9dec160a42f1998de4650ba161d795106993398dba6fe7ad433e91fc27d");
  });
});
