import { Composer, type Context } from "grammy";
import type { Bot } from "grammy";
import { getScanData, scanLink, shortLine, type ScanData } from "../scan.js";
import { OFFICIAL } from "../content.js";
import { store as verifyStore } from "../verify/index.js";
import { watchStore, type Baseline, type WatchEntry } from "./store.js";
import { sweepWallets, startWalletWatch } from "./wallet.js";

/**
 * GL1TCH Watchtower — holders (and anyone) can /watch a token; a periodic sweep
 * re-scans each one and pings the chat if its safety *worsens* (LP unlocked, an
 * authority comes back, verdict drops). Read-only; it never touches a wallet.
 *
 * Watch slots are HOLDER-GATED: more $GL1TCH = more tokens you can guard. Free users
 * get a few; verified holders unlock far more — a concrete reason to hold.
 */
export const watchCommands = new Composer<Context>();

const HTML = { parse_mode: "HTML" as const, link_preview_options: { is_disabled: true } };
// Watch-slot cap by verified rank tier (verify your wallet at /verify to claim it).
export const TIER_CAP: Record<string, number> = { observer: 3, infected: 10, bearer: 25, core: 50, ghost: 200 };
export function capFor(userId?: number): number {
  if (!userId) return TIER_CAP.observer;
  const v = verifyStore.getVerification(userId);
  return (v && TIER_CAP[v.tierId]) || TIER_CAP.observer;
}
const SWEEP_MS = Number(process.env.WATCH_SWEEP_MS ?? 3 * 60 * 60_000); // 3h
const VERDICT_ORDER = ["CLEAN", "LOW RISK", "CAUTION", "HIGH RISK", "RUG-SHAPED"];
const SEV: Record<string, number> = { pass: 0, warn: 1, fail: 2 };
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function baselineFrom(d: ScanData): Baseline {
  const checks: Record<string, string> = {};
  for (const c of d.checks) checks[c.label] = c.status;
  return { verdict: d.verdict, score: d.score, lpLockedPct: d.meta.lpLockedPct ?? null, checks };
}

/** Human-readable list of *worsening* changes (empty = nothing got worse). */
function worsened(prev: Baseline, cur: Baseline): string[] {
  const out: string[] = [];
  const oi = VERDICT_ORDER.indexOf(prev.verdict);
  const ni = VERDICT_ORDER.indexOf(cur.verdict);
  if (oi !== -1 && ni !== -1 && ni > oi) out.push(`Verdict dropped: <b>${esc(prev.verdict)} → ${esc(cur.verdict)}</b>`);

  for (const [label, curStatus] of Object.entries(cur.checks)) {
    if (label.startsWith("LP locked")) continue; // handled precisely below
    const prevStatus = prev.checks[label];
    if (prevStatus == null) continue;
    const a = SEV[prevStatus]; const b = SEV[curStatus];
    if (a != null && b != null && b > a) out.push(`${esc(label)}: <b>${esc(prevStatus)} → ${esc(curStatus)}</b>`);
  }

  if (prev.lpLockedPct != null && cur.lpLockedPct != null && prev.lpLockedPct - cur.lpLockedPct >= 20) {
    out.push(`LP lock dropped: <b>${prev.lpLockedPct}% → ${cur.lpLockedPct}%</b>`);
  }
  return out;
}

/* ----------------------------- commands ----------------------------- */

watchCommands.command("watch", async (ctx) => {
  const arg = (ctx.match || "").trim();
  const userId = ctx.from?.id;
  if (!userId) return;
  if (!arg) {
    await ctx.reply(
      "👁 <b>GL1TCH WATCHTOWER</b>\n\nI'll keep watching a token and ping you here if its safety changes — LP unlocked, an authority comes back, verdict drops.\n\n<code>/watch bonk</code>\n<code>/watch 3HQJwwHvzy8pGkPqGQcb4thZCH88MUCHVVSNtHn6pump</code>\n\n<code>/watching</code> — your list   ·   <code>/unwatch &lt;token&gt;</code> — stop",
      HTML
    );
    return;
  }
  await ctx.replyWithChatAction("typing").catch(() => {});
  let data;
  try { data = await getScanData(arg); } catch { data = null; }
  if (!data) { await ctx.reply("⚪ Couldn't find that token to watch — try the exact name or paste the contract.", HTML); return; }

  const already = watchStore.has(userId, data.chain, data.mint);
  const cap = capFor(userId);
  if (!already && watchStore.countByUser(userId) >= cap) {
    const verified = !!verifyStore.getVerification(userId);
    await ctx.reply(
      `👁 You're watching ${cap} tokens — your current limit.\n\n${verified ? "Hold more <b>$GL1TCH</b> to climb a tier and unlock more slots." : "Verify your wallet to unlock more — holders get up to 200 watch slots."}\nTiers: Infected 10 · Bearer 25 · Core 50 · Ghost 200 → <code>/verify</code> · ${OFFICIAL.SITE}/ranks`,
      HTML
    );
    return;
  }

  const entry: WatchEntry = {
    userId, chatId: ctx.chat.id, chain: data.chain, address: data.mint,
    label: data.symbol || data.name || data.mint.slice(0, 6), baseline: baselineFrom(data),
    addedAt: Date.now(), lastChecked: Date.now(),
  };
  watchStore.add(entry);
  await ctx.reply(
    `👁 <b>Watching.</b> ${already ? "Refreshed the baseline." : `I'll ping this chat if its safety changes (checked every ${Math.round(SWEEP_MS / 3.6e6)}h).`}\n\n${shortLine(data)}\n\n<a href="${scanLink(data.chain, data.mint)}">Full report →</a>`,
    HTML
  );
});

watchCommands.command("unwatch", async (ctx) => {
  const arg = (ctx.match || "").trim();
  const userId = ctx.from?.id;
  if (!userId) return;
  const mine = watchStore.listByUser(userId);
  if (!arg) {
    const list = mine.length ? mine.map((w) => `• ${esc(w.label)} (${esc(w.chain)})`).join("\n") : "—";
    await ctx.reply(`Which one? <code>/unwatch &lt;name or address&gt;</code>\n\nYou're watching:\n${list}`, HTML);
    return;
  }
  let removed: WatchEntry | null = null;
  const byAddr = watchStore.removeByAddress(userId, arg);
  if (byAddr) removed = byAddr;
  else {
    const match = mine.find((w) => w.label.toLowerCase() === arg.toLowerCase() || w.label.toLowerCase().includes(arg.toLowerCase()));
    if (match && watchStore.remove(userId, match.chain, match.address)) removed = match;
  }
  await ctx.reply(removed ? `🚫 Stopped watching <b>${esc(removed.label)}</b>.` : "Couldn't find that in your watchlist. Try <code>/watching</code>.", HTML);
});

watchCommands.command("watching", async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;
  const mine = watchStore.listByUser(userId);
  if (!mine.length) {
    await ctx.reply("👁 You're not watching anything yet.\n\n<code>/watch &lt;token&gt;</code> and I'll alert you if its safety changes.", HTML);
    return;
  }
  const lines = mine.map((w) => {
    const lp = w.baseline.lpLockedPct != null ? ` · LP ${w.baseline.lpLockedPct}%` : "";
    return `• <b>${esc(w.label)}</b> · ${esc(w.chain)} · ${esc(w.baseline.verdict)} ${w.baseline.score}/100${lp}`;
  });
  const cap = capFor(userId);
  const v = verifyStore.getVerification(userId);
  const tierNote = v ? ` · ${v.tierId}` : " · unverified";
  await ctx.reply(`👁 <b>Your Watchtower (${mine.length}/${cap}${tierNote})</b>\n\n${lines.join("\n")}\n\n<i>I re-check these automatically and ping you on any safety drop.</i>${cap <= 3 ? `\n\nHold $GL1TCH + <code>/verify</code> for more slots.` : ""}`, HTML);
});

/* ----------------------------- sweep ----------------------------- */

async function sweepOnce(bot: Bot): Promise<void> {
  const all = watchStore.all();
  if (!all.length) return;
  console.log(`[watch] sweep: ${all.length} tokens`);
  for (const entry of all) {
    let data;
    try { data = await getScanData(entry.address, entry.chain); } catch { data = null; }
    if (!data) { await sleep(1500); continue; } // transient failure — don't alert, try next time
    const cur = baselineFrom(data);
    const changes = worsened(entry.baseline, cur);
    if (changes.length) {
      const mention = `<a href="tg://user?id=${entry.userId}">your watch</a>`;
      const msg = `🚨 <b>WATCHTOWER ALERT</b> — ${mention}\n\n${shortLine(data)}\n\n<b>What changed:</b>\n• ${changes.join("\n• ")}\n\n<a href="${scanLink(data.chain, data.mint)}">Full report →</a>\n<i>GL1TCH read the chain. Not financial advice.</i>`;
      try { await bot.api.sendMessage(entry.chatId, msg, HTML); } catch (e) { console.error("[watch] alert send failed:", (e as Error).message); }
    }
    // Edge-trigger: adopt the new state as baseline either way (so we don't re-alert).
    watchStore.updateBaseline(entry, cur, Date.now());
    await sleep(1500); // be gentle on the scan API
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function startWatchtower(bot: Bot): void {
  watchStore.load();
  startWalletWatch();
  const sweep = () => {
    sweepOnce(bot).catch((e) => console.error("[watch] sweep error:", e));
    sweepWallets(bot).catch((e) => console.error("[wallet] sweep error:", e));
  };
  // First sweep a minute after boot (let the process settle), then on an interval.
  setTimeout(sweep, 60_000);
  setInterval(sweep, SWEEP_MS);
  console.log(`[watch] Watchtower armed — sweeping every ${Math.round(SWEEP_MS / 3.6e6)}h, holder-gated slots (observer ${TIER_CAP.observer} → ghost ${TIER_CAP.ghost}); wallet-watch active`);
}
