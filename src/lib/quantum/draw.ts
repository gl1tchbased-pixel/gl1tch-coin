/**
 * Quantum Draw — commit-reveal engine (pure, deterministic, no I/O).
 *
 * Fairness model (spec §7.2): the winner is a pure function of two values that
 * cannot both be known/altered at the same time:
 *   1. the participant set, frozen and committed as a Merkle root BEFORE any
 *      pulse exists, and
 *   2. a future CURBy quantum pulse value, unknowable at commit time.
 *
 * winner_index = H(pulseHex || merkleRoot) mod poolSize
 *
 * Because the pulse is hashed together with the frozen root, the same pulse
 * yields a different winner in every draw (no cross-draw replay), and anyone
 * can recompute the result from public inputs. Rank/balance never enters this
 * math — it only decides which pools a wallet may enter (spec §7.3).
 */
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, utf8ToBytes } from "@noble/hashes/utils.js";

const h = (b: Uint8Array): string => bytesToHex(sha256(b));
/** Hash of a UTF-8 string, hex. */
export const hashHex = (s: string): string => h(utf8ToBytes(s));

const hexToBytes = (hex: string): Uint8Array => {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  if (clean.length % 2 !== 0 || /[^0-9a-fA-F]/.test(clean)) throw new Error("invalid hex");
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  return out;
};

/**
 * Merkle root of the participant list. Leaves are hashed first (second-preimage
 * hardening); an odd level duplicates its last node. Order matters and is fixed
 * to the participant list order at freeze time, so the root is reproducible.
 */
export function merkleRoot(participants: string[]): string {
  if (participants.length === 0) return hashHex("gl1tch:empty-draw");
  let level = participants.map((p) => hashHex(`leaf:${p}`));
  while (level.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < level.length; i += 2) {
      const left = level[i];
      const right = i + 1 < level.length ? level[i + 1] : left; // duplicate last if odd
      next.push(h(hexToBytes(left + right)));
    }
    level = next;
  }
  return level[0];
}

/**
 * Deterministic winner index in [0, poolSize). Uses the full 256-bit digest as
 * a big integer mod poolSize. Modulo bias is negligible (2^256 ≫ any real pool).
 */
export function winnerIndex(pulseHex: string, merkleRootHex: string, poolSize: number): number {
  if (!Number.isInteger(poolSize) || poolSize <= 0) throw new Error("poolSize must be a positive integer");
  const digest = h(hexToBytes(normalizeHex(pulseHex) + normalizeHex(merkleRootHex)));
  const n = BigInt("0x" + digest);
  return Number(n % BigInt(poolSize));
}

const normalizeHex = (hex: string): string => {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  if (clean.length === 0 || /[^0-9a-fA-F]/.test(clean)) throw new Error("invalid hex input");
  return clean.toLowerCase();
};

export interface DrawResult {
  merkleRoot: string;
  winnerIndex: number;
  winner: string;
  poolSize: number;
}

/**
 * Full deterministic draw from a frozen participant list and a revealed pulse.
 * Duplicate/empty participants are rejected — freezing must produce a clean set.
 */
export function computeWinner(participants: string[], pulseHex: string): DrawResult {
  if (participants.length === 0) throw new Error("no participants");
  if (new Set(participants).size !== participants.length) throw new Error("duplicate participants");
  if (participants.some((p) => !p || typeof p !== "string")) throw new Error("invalid participant");
  const root = merkleRoot(participants);
  const idx = winnerIndex(pulseHex, root, participants.length);
  return { merkleRoot: root, winnerIndex: idx, winner: participants[idx], poolSize: participants.length };
}

/** The commitment published when a draw window closes (before the pulse exists). */
export interface DrawCommitment {
  merkleRoot: string;
  poolSize: number;
}

export function freezeCommitment(participants: string[]): DrawCommitment {
  if (new Set(participants).size !== participants.length) throw new Error("duplicate participants");
  return { merkleRoot: merkleRoot(participants), poolSize: participants.length };
}
