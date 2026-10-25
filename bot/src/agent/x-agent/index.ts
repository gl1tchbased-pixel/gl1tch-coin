/** X Agent — public API.
 *
 * Workflow (X is on free tier → no API posting):
 *   1. Content Engine generates 3-6 ready tweet variants.
 *   2. Discovery Engine sweeps Nitter + Reddit + DexScreener for engagement
 *      opportunities (others' posts worth replying to).
 *   3. Approval Queue DMs admin each item with inline buttons:
 *      "🐦 Tweet via X" / "🐦 Reply via X" → opens X composer with text pre-filled.
 *      Admin taps the X "Tweet" button. Nothing is posted automatically.
 *
 * No paid X API, no browser automation (ban-proof), all signals from public data. */

import type { Api } from "grammy";
import { config } from "../../config.js";
import { buildReplyFor } from "./content.js";
import { composeBatch } from "./compose.js";
import { draftMemory } from "./drafts.js";
import { readSignals, type Signals } from "./signals.js";
import { weightOf } from "./perf.js";
import { sweep } from "./discovery/index.js";
import { dmAdminOpportunity, dmAdminVariant } from "./queue.js";
import { dmPendingRatings } from "./ratings.js";
import { deltaToVariant, readDelta } from "./holders.js";
import { pickRedditAngle, REDDIT_ANGLE_TIP } from "./redditangles.js";

const HTML = { parse_mode: "HTML" as const, link_preview_options: { is_disabled: true } };

async function dmAdmins(api: Api, text: string): Promise<void> {
  for (const id of config.adminIds) {
    try { await api.sendMessage(id, text, HTML); } catch { /* skip */ }
  }
}

function deskHeader(sig: Signals, n: number): string {
  const lines = ["<b>📡 SIGNAL DESK</b>"];
  lines.push(
    sig.radar
      ? `Rug Radar, latest sweep: ${sig.radar.scanned} scanned · ${sig.radar.flagged} flagged`
      : "Rug Radar: unreachable this round (the drafts below don't depend on it)",
  );
  if (sig.userScans !== null && sig.splitSince) {
    const since = new Date(sig.splitSince).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "Europe/Istanbul" });
    lines.push(`People-run scans since ${since}: ${sig.userScans.toLocaleString("en-US")}`);
  }
  lines.push("", `${n} post draft${n === 1 ? "" : "s"} below, each built from live data. 🐦 opens X with the text ready; ✅ once posted.`);
  return lines.join("\n");
}

/** Draft posts from live data (latest radar sweep, scan counter, shipped features) and DM them under one summary. */
export async function runContentBatch(api: Api, opts: { count?: number } = {}): Promise<void> {
  const sig = await readSignals();
  const drafts = composeBatch(
    { sig, seed: Math.floor(Date.now() / 1000), now: Date.now(), lastUsed: (k) => draftMemory.lastUsed(k), weight: weightOf },
    opts.count ?? 3,
  );
  if (drafts.length === 0) {
    await dmAdmins(api, "<b>📡 SIGNAL DESK</b>\n\nNothing new worth posting this round; every subject was used recently.");
    return;
  }
  await dmAdmins(api, deskHeader(sig, drafts.length));
  for (const id of config.adminIds) {
    for (const d of drafts) await dmAdminVariant(api, id, d.variant);
  }
  draftMemory.commit(drafts);
}

/** Sweep external sources, surface scored reply opportunities, push to admins. */
export async function runDiscoverySweep(
  api: Api,
  opts: { top?: number } = {},
): Promise<void> {
  const result = await sweep({ top: opts.top ?? 5 });

  const sourceLines = Object.entries(result.bySource)
    .map(([s, n]) => `${s} ${n}`)
    .join(" · ");
  const errLine = result.errors.length
    ? `\n<i>⚠ Source errors: ${result.errors.join("; ")}</i>`
    : "";
  const head =
    `<b>X AGENT — DISCOVERY SWEEP</b>\n\n` +
    `Sources scanned: ${sourceLines}\n` +
    `Surfaced ${result.opportunities.length} opportunit${result.opportunities.length === 1 ? "y" : "ies"} (score ≥ 40).` +
    errLine;
  await dmAdmins(api, head);

  if (result.opportunities.length === 0) {
    await dmAdmins(
      api,
      "<i>No opportunities cleared the score floor this sweep. This is normal during quiet hours — try again later.</i>",
    );
    return;
  }

  let seed = Math.floor(Date.now() / 1000);
  for (const id of config.adminIds) {
    for (const o of result.opportunities) {
      const reply = buildReplyFor(o, seed++);
      await dmAdminOpportunity(api, id, o, reply);
    }
  }
}

/** DM one rotated Reddit comment angle per sweep (rotates by Unix-day). */
async function dmRedditAngle(api: Api): Promise<void> {
  // Rotate per ~hour so back-to-back manual runs vary; for the regular 2h
  // cadence this gives ~12 different angles a day mapped over the 9-card pool.
  const seed = Math.floor(Date.now() / 36e5);
  const angle = pickRedditAngle(seed);
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const text =
    `<b>📕 REDDIT COMMENT ANGLE</b>\n\n` +
    `<i>Trigger:</i> ${esc(angle.trigger)}\n` +
    `<i>Subs that fit:</i> ${angle.subs.join(", ")}\n\n` +
    `<pre>${esc(angle.comment)}</pre>\n\n` +
    REDDIT_ANGLE_TIP;
  const reply_markup = {
    inline_keyboard: angle.subs.slice(0, 3).map((s) => [
      { text: `🔗 Open ${s} (new)`, url: `https://reddit.com/${s}/new/` },
    ]),
  };
  for (const id of config.adminIds) {
    try {
      await api.sendMessage(id, text, {
        parse_mode: "HTML",
        link_preview_options: { is_disabled: true },
        reply_markup,
      });
    } catch {
      /* admin hasn't /started — skip */
    }
  }
}

/** If holder count grew since last reading, push a "GROWTH LOG" variant. */
async function runHolderGrowthCheck(api: Api): Promise<void> {
  try {
    const d = await readDelta();
    const v = deltaToVariant(d);
    if (!v) return;
    await dmAdmins(api, `<b>X AGENT — HOLDER GROWTH</b>\n\n+${d.delta} new holders (total ${d.current}). Fresh variant below.`);
    for (const id of config.adminIds) {
      await dmAdminVariant(api, id, v);
    }
  } catch (err) {
    console.warn("[holders] check failed:", (err as Error).message);
  }
}

/** One sweep: pending ratings first (so old posts get rated before new ones arrive), holder growth, the post drafts,
 *  discovery only when asked for (`opportunities` > 0; token listings aren't posts anyone can reply to), and at most
 *  one Reddit angle a day so it doesn't bury the drafts. */
export async function runFullSweep(api: Api, opts: { variants?: number; opportunities?: number } = {}): Promise<void> {
  await dmPendingRatings(api, 2);
  await runHolderGrowthCheck(api);
  await runContentBatch(api, { count: opts.variants ?? 3 });
  if ((opts.opportunities ?? 0) > 0) await runDiscoverySweep(api, { top: opts.opportunities });
  const lastAngle = draftMemory.lastUsed("kind:reddit");
  if (lastAngle === null || Date.now() - lastAngle > 20 * 3_600_000) {
    await dmRedditAngle(api);
    draftMemory.mark("kind:reddit");
  }
}

/** Standalone manual fetch of one Reddit angle (admin command). */
export async function runRedditAngle(api: Api): Promise<void> {
  await dmRedditAngle(api);
}
