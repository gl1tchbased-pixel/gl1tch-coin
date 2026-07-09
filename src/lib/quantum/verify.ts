/**
 * Independent, zero-trust Draw verification (isomorphic — runs in the browser).
 *
 * The whole point of a provably-fair draw is that you should NOT have to trust
 * GL1TCH. This module re-fetches the CURBy round directly from the beacon
 * (random.colorado.edu sends `access-control-allow-origin: *`) and recomputes
 * every step, so a third party can confirm the winner from first principles:
 *
 *   1. the value GL1TCH recorded == the value CURBy actually published
 *   2. the committed Merkle root == the hash of the published entry list
 *   3. the winner == sha256(curbyValue ‖ merkleRoot) mod entries
 *
 * If all three hold, the result is correct no matter who ran the draw.
 */
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, utf8ToBytes } from "@noble/hashes/utils.js";
import { merkleRoot, winnerIndex } from "./draw";
import type { Draw, BeaconEntry } from "./client";

const CURBY = (typeof process !== "undefined" && process.env.CURBY_URL) || "https://random.colorado.edu";

export interface CurbyRound {
  index: number;
  round: number;
  stage: string;
  dataHash: string;
}

/**
 * Fetch a CURBy round directly from the beacon (browser-safe, CORS *). The path
 * parameter is the ROUND number (e.g. 28297), not the pulse index — verified
 * against the live API. Pass "latest" for the current round.
 */
export async function fetchCurbyRound(round: number | "latest"): Promise<CurbyRound | null> {
  try {
    const r = await fetch(`${CURBY}/api/curbyq/round/${round}`, { cache: "no-store" });
    if (!r.ok) return null;
    const json = await r.json();
    const rec = Array.isArray(json) ? json[json.length - 1] : json;
    const p = rec?.data?.content?.payload;
    const idx = rec?.data?.content?.index;
    if (!p || p.stage !== "randomness" || typeof p.dataHash !== "string" || typeof idx !== "number") return null;
    return { index: idx, round: p.round, stage: p.stage, dataHash: p.dataHash.toLowerCase() };
  } catch {
    return null;
  }
}

export interface VerifyCheck {
  key: string;
  label: string;
  ok: boolean;
  detail: string;
}

export interface DrawVerification {
  verified: boolean;
  checks: VerifyCheck[];
}

/**
 * Independently verify a REVEALED draw. Re-fetches the CURBy round in the caller's
 * environment and recomputes the winner. Returns per-step checks + an overall verdict.
 */
export async function verifyDrawIndependently(draw: Draw): Promise<DrawVerification> {
  const checks: VerifyCheck[] = [];

  if (draw.status !== "revealed" || !draw.pulse || !draw.merkleRoot || draw.winnerIndex === undefined) {
    return { verified: false, checks: [{ key: "state", label: "Draw is revealed", ok: false, detail: `status: ${draw.status}` }] };
  }

  // 1. Re-fetch the CURBy round (by round number) and confirm both the value and the index
  //    match what CURBy actually published — GL1TCH cannot have swapped in a different pulse.
  const round = await fetchCurbyRound(draw.pulse.round);
  const valueMatch = !!round && round.dataHash === draw.pulse.valueHex && round.index === draw.pulse.index;
  checks.push({
    key: "curby",
    label: "CURBy value matches (re-fetched from random.colorado.edu)",
    ok: valueMatch,
    detail: round ? `round ${round.round}, index ${round.index}` : "could not reach CURBy",
  });

  // 2. Recompute the Merkle root of the published entry list.
  const recomputedRoot = merkleRoot(draw.participants);
  const rootMatch = recomputedRoot === draw.merkleRoot;
  checks.push({
    key: "merkle",
    label: "Committed Merkle root matches the entry list",
    ok: rootMatch,
    detail: `${recomputedRoot.slice(0, 20)}…`,
  });

  // 3. Recompute the winner from the CURBy value + the root.
  const recomputedIndex = winnerIndex(draw.pulse.valueHex, draw.merkleRoot, draw.participants.length);
  const winnerMatch = recomputedIndex === draw.winnerIndex && draw.participants[recomputedIndex] === draw.winner;
  checks.push({
    key: "winner",
    label: "Winner recomputes to the recorded result",
    ok: winnerMatch,
    detail: `index ${recomputedIndex} → ${draw.participants[recomputedIndex] ?? "?"}`,
  });

  return { verified: valueMatch && rootMatch && winnerMatch, checks };
}

// ---- Beacon hash-chain verification (Twine-style tamper-evidence, byte-identical to the bot) ----

const BEACON_GENESIS = "genesis";

/** Canonical string of a beacon entry — MUST match bot/src/quantum-core/logic.ts::beaconCanonical. */
export function beaconCanonical(e: Pick<BeaconEntry, "seq" | "at" | "drawId" | "event" | "detail">): string {
  return `${e.seq}|${e.at}|${e.drawId}|${e.event}|${JSON.stringify(e.detail)}`;
}

export function beaconHash(prevHash: string, e: Pick<BeaconEntry, "seq" | "at" | "drawId" | "event" | "detail">): string {
  return bytesToHex(sha256(utf8ToBytes(prevHash + "|" + beaconCanonical(e))));
}

export interface BeaconChainResult {
  ok: boolean;
  length: number;
  brokenAt?: number;
  reason?: string;
}

/**
 * Verify the Beacon is an unbroken hash chain: every entry's hash recomputes from
 * its content + the previous entry's hash. Any edit, deletion, or insertion breaks
 * it. `entries` may be newest-first (as the API returns) — set `newestFirst`.
 * The first retained entry's prevHash is taken as the anchor (the log may be a window).
 */
export function verifyBeaconChain(entries: BeaconEntry[], newestFirst = true): BeaconChainResult {
  const chron = newestFirst ? [...entries].reverse() : [...entries];
  if (chron.length === 0) return { ok: true, length: 0 };
  for (let i = 0; i < chron.length; i++) {
    const e = chron[i];
    if (typeof e.hash !== "string" || typeof e.prevHash !== "string" || typeof e.seq !== "number") {
      return { ok: false, length: chron.length, brokenAt: i, reason: "entry not chained" };
    }
    if (i > 0 && e.prevHash !== chron[i - 1].hash) {
      return { ok: false, length: chron.length, brokenAt: i, reason: "prevHash mismatch (link broken)" };
    }
    const recomputed = beaconHash(e.prevHash, e);
    if (recomputed !== e.hash) {
      return { ok: false, length: chron.length, brokenAt: i, reason: "hash mismatch (entry altered)" };
    }
  }
  return { ok: true, length: chron.length };
}

void BEACON_GENESIS;
