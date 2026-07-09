import { createHash } from "node:crypto";

/**
 * Quantum Core — pure draw logic (bot side). Byte-identical to the site's
 * src/lib/quantum/draw.ts (same SHA-256 scheme) so a winner computed here can be
 * independently recomputed on the site and by anyone. Uses node:crypto (no dep).
 *
 * Commit-reveal (spec §7.2):
 *   1. window closes → participant list frozen → Merkle root committed, and a
 *      FUTURE CURBy round targeted (targetAfterIndex = latest index at freeze).
 *   2. a later finalized round (index > targetAfterIndex) is revealed as the pulse.
 *   3. winner = H(pulseValue || merkleRoot) mod poolSize — recomputable by all.
 * The pulse cannot be known at commit time; the list cannot change after commit.
 */

const sha = (buf: Buffer): string => createHash("sha256").update(buf).digest("hex");
const hashUtf8 = (s: string): string => sha(Buffer.from(s, "utf8"));
const normHex = (hex: string): string => {
  const c = hex.startsWith("0x") ? hex.slice(2) : hex;
  if (c.length === 0 || /[^0-9a-fA-F]/.test(c)) throw new Error("invalid hex");
  return c.toLowerCase();
};

export function merkleRoot(participants: string[]): string {
  if (participants.length === 0) return hashUtf8("gl1tch:empty-draw");
  let level = participants.map((p) => hashUtf8(`leaf:${p}`));
  while (level.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < level.length; i += 2) {
      const left = level[i];
      const right = i + 1 < level.length ? level[i + 1] : left;
      next.push(sha(Buffer.from(left + right, "hex")));
    }
    level = next;
  }
  return level[0];
}

export function winnerIndex(pulseHex: string, merkleRootHex: string, poolSize: number): number {
  if (!Number.isInteger(poolSize) || poolSize <= 0) throw new Error("poolSize must be positive");
  const digest = sha(Buffer.from(normHex(pulseHex) + normHex(merkleRootHex), "hex"));
  return Number(BigInt("0x" + digest) % BigInt(poolSize));
}

export type DrawStatus = "open" | "committed" | "revealed" | "void";

export interface DrawPulse {
  round: number;
  index: number;
  valueHex: string;
  cid: string;
  timestamp: string;
}

export interface Draw {
  id: string;
  type: string;
  openedAt: number;
  closesAt: number;
  status: DrawStatus;
  participants: string[];
  merkleRoot?: string;
  targetAfterIndex?: number;
  committedAt?: number;
  pulse?: DrawPulse;
  winnerIndex?: number;
  winner?: string;
  revealedAt?: number;
  note?: string;
}

export interface BeaconEntry {
  at: number;
  drawId: string;
  event: DrawStatus | "opened";
  detail: Record<string, unknown>;
}

export interface Transition {
  draw: Draw;
  beacon: BeaconEntry;
}

/** Deterministic draw id for the period containing `now`. */
export function drawIdForPeriod(now: number, windowMs: number): string {
  return `draw-${Math.floor(now / windowMs)}`;
}

/** Open a fresh draw for a period. */
export function openDraw(id: string, type: string, now: number, windowMs: number): Transition {
  const draw: Draw = { id, type, openedAt: now, closesAt: now + windowMs, status: "open", participants: [] };
  return { draw, beacon: { at: now, drawId: id, event: "opened", detail: { closesAt: draw.closesAt, type } } };
}

/**
 * Freeze + commit step: when an open window's time is up, freeze the participant
 * list into a Merkle root and target a FUTURE CURBy round (latestIndex at freeze).
 * Zero-participant windows are voided (nothing to draw). Returns null if not due.
 */
export function freezeCommit(draw: Draw, now: number, latestIndex: number): Transition | null {
  if (draw.status !== "open" || now < draw.closesAt) return null;
  if (draw.participants.length === 0) {
    const voided: Draw = { ...draw, status: "void", note: "no participants", committedAt: now };
    return { draw: voided, beacon: { at: now, drawId: draw.id, event: "void", detail: { reason: "no_participants" } } };
  }
  const root = merkleRoot(draw.participants);
  const committed: Draw = {
    ...draw,
    status: "committed",
    merkleRoot: root,
    targetAfterIndex: latestIndex,
    committedAt: now,
  };
  return {
    draw: committed,
    beacon: {
      at: now,
      drawId: draw.id,
      event: "committed",
      detail: { merkleRoot: root, poolSize: draw.participants.length, targetAfterIndex: latestIndex },
    },
  };
}

/**
 * Reveal step: given a finalized pulse whose index is strictly greater than the
 * committed target (so it did not exist at commit time), compute the winner.
 * Returns null if the pulse is not yet eligible → the executor DEFERS (no downgrade).
 */
export function revealDraw(draw: Draw, pulse: DrawPulse, now: number): Transition | null {
  if (draw.status !== "committed" || !draw.merkleRoot || draw.targetAfterIndex === undefined) return null;
  if (pulse.index <= draw.targetAfterIndex) return null; // pulse must post-date the commitment
  const idx = winnerIndex(pulse.valueHex, draw.merkleRoot, draw.participants.length);
  const revealed: Draw = {
    ...draw,
    status: "revealed",
    pulse,
    winnerIndex: idx,
    winner: draw.participants[idx],
    revealedAt: now,
  };
  return {
    draw: revealed,
    beacon: {
      at: now,
      drawId: draw.id,
      event: "revealed",
      detail: {
        winner: draw.participants[idx],
        winnerIndex: idx,
        merkleRoot: draw.merkleRoot,
        pulseValueHex: pulse.valueHex,
        pulseRound: pulse.round,
        pulseIndex: pulse.index,
        pulseCid: pulse.cid,
        recompute: "winnerIndex = sha256(pulseValueHex || merkleRoot) mod poolSize",
      },
    },
  };
}
