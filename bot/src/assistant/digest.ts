import { OFFICIAL } from "../content.js";
import { safeReadJson, safeWriteJson } from "../lib/safe-io.js";
import { statsStore } from "../stats.js";
import { chat } from "./llm.js";
import { allowedAddresses, sanitizeReply } from "./sanitize.js";

/**
 * The daily group post: what actually happened since yesterday, or nothing. The old post rotated brand slogans,
 * which is exactly what makes a group look dead. If there is no news, or a number can't be trusted, it stays quiet.
 */

const STORE_PATH = `${process.env.RAILWAY_VOLUME_MOUNT_PATH ?? "/tmp"}/gl1tch-digest.json`;

interface Baseline {
  user: number;
  flagged: number;
}

export interface DigestFacts {
  peopleScans: number;
  flagged: number;
  radarScanned: number;
}

/** A model can phrase numbers but must not create them. Every number it writes has to be in the facts. */
export function numbersAreFromFacts(text: string, facts: string): boolean {
  const numbers = (s: string) => (s.match(/\d[\d.,]*\d|\d/g) ?? []).map((n) => n.replace(/,/g, ""));
  const known = new Set(numbers(facts));
  return numbers(text).every((n) => known.has(n));
}

async function radarScanned(): Promise<number> {
  try {
    const r = await fetch(`${OFFICIAL.SITE}/api/radar`, { signal: AbortSignal.timeout(20_000) });
    return Number(((await r.json()) as { scanned?: number }).scanned) || 0;
  } catch {
    return 0;
  }
}

/** Writes the post from the facts. Null means don't post. */
export async function writeDigest(f: DigestFacts): Promise<string | null> {
  if (f.peopleScans <= 0 && f.flagged <= 0) return null;
  const facts = [
    `Scans run by people in the last 24 hours: ${f.peopleScans}`,
    `Tokens the scanners flagged as high risk in the last 24 hours (mostly automatic checks): ${f.flagged}`,
    f.radarScanned ? `The latest Rug Radar sweep checked ${f.radarScanned} fresh tokens` : "",
  ].filter(Boolean).join("\n");

  const reply = await chat([
    {
      role: "system",
      content:
        "You write one short daily note for the GL1TCH token-safety scanner's Telegram group, in English. 2 or 3 plain sentences saying what happened, like a person reporting to a community. " +
        "Use only the facts given and no other numbers. Do not name tokens. No hype, no slogans, no buy talk, no markdown, no links. Optionally end by inviting people to ask you anything or paste a contract.",
    },
    { role: "user", content: facts },
  ]);
  if (!reply?.content) return null;
  if (!numbersAreFromFacts(reply.content, facts)) {
    console.warn("[digest] dropped: the model wrote a number that isn't in the facts");
    return null;
  }
  return sanitizeReply(reply.content, allowedAddresses()) || null;
}

/** Today's post, measured against yesterday's counters. `commit` is false for previews, so they don't eat the day. */
export async function buildDigest(opts: { commit: boolean }): Promise<string | null> {
  const s = statsStore.get();
  const prev = safeReadJson<Baseline>(STORE_PATH, "digest");
  if (opts.commit) {
    try {
      safeWriteJson(STORE_PATH, { user: s.user, flagged: s.flagged });
    } catch (e) {
      console.error("[digest] save failed:", (e as Error).message);
    }
  }
  // The first run has no yesterday to compare with, so it can only set the baseline.
  if (!prev) return null;
  return writeDigest({
    peopleScans: Math.max(0, s.user - (Number(prev.user) || 0)),
    flagged: Math.max(0, s.flagged - (Number(prev.flagged) || 0)),
    radarScanned: await radarScanned(),
  });
}
