import { Composer, type Context } from "grammy";
import { yieldStore } from "./store.js";
import { yieldWatchStore, YIELD_WATCH_CAP } from "./watch-store.js";
import { baselineOf } from "./alerts.js";
import { SITE_YIELD, cardUrl, chainLabel, pctText, usdText } from "./labels.js";
import type { YieldOpportunity, YieldSnapshot } from "./types.js";

/**
 * Yield X-Ray in Telegram: /yield (overview or search), /yieldwatch · /yieldwatching · /yieldunwatch (alerts),
 * and the website's "Watch on Telegram" button, a deep link t.me/<bot>?start=yield_<id>. Read-only.
 */
export const yieldCommands = new Composer<Context>();

const HTML = { parse_mode: "HTML" as const, link_preview_options: { is_disabled: true } };
const ID_RE = /^[a-z0-9-]{3,60}$/;
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function parseYieldPayload(payload: string): string | null {
  const m = /^yield_(.+)$/.exec(payload.trim());
  return m && ID_RE.test(m[1]) ? m[1] : null;
}

/** Every query word must match the id, symbol, chain or protocol. Largest deposits first, at most 8. */
export function searchYield(snap: YieldSnapshot | null, query: string): YieldOpportunity[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!snap || !words.length) return [];
  const hay = (o: YieldOpportunity) => [o.id, o.symbol.toLowerCase(), o.chain, chainLabel(o.chain).toLowerCase(), o.protocol].join(" ");
  return snap.opportunities
    .filter((o) => words.every((w) => hay(o).includes(w)))
    .sort((a, b) => (b.tvlUsd ?? 0) - (a.tvlUsd ?? 0))
    .slice(0, 8);
}

export function formatYieldLine(o: YieldOpportunity): string {
  const apy = o.apy == null ? "measuring…" : `${pctText(o.apy)}${o.kind === "dex-lp" ? " fee APR" : ""}`;
  return `• <b>${esc(o.symbol)}</b> (${esc(o.protocol)}, ${chainLabel(o.chain)}): ${apy} · ${usdText(o.tvlUsd)}${o.stale ? " · stale" : ""}\n  ${cardUrl(o.id)}`;
}

function range(rows: YieldOpportunity[]): string {
  const v = rows.map((r) => r.apy).filter((x): x is number => x != null);
  if (!v.length) return "measuring…";
  const lo = Math.min(...v), hi = Math.max(...v);
  return lo === hi ? pctText(lo) : `${pctText(lo)} – ${pctText(hi)}`;
}

export function summaryText(snap: YieldSnapshot): string {
  const rows = snap.opportunities;
  const groups: [string, YieldOpportunity[]][] = [
    ["Stablecoin lending", rows.filter((o) => o.kind === "lending" && o.stable)],
    ["SOL staking", rows.filter((o) => o.chain === "solana" && o.kind === "liquid-staking")],
    ["ETH staking", rows.filter((o) => o.chain === "ethereum" && o.kind === "liquid-staking")],
    ["DEX pools (fee APR)", rows.filter((o) => o.kind === "dex-lp")],
  ];
  return (
    `📈 <b>GL1TCH YIELD X-RAY</b>\nWhere the APY comes from, read straight from the chain.\n\n` +
    groups.filter(([, g]) => g.length).map(([name, g]) => `<b>${name}:</b> ${range(g)}`).join("\n") +
    `\n\n<b>How to use it</b>\n` +
    `<code>/yield usdc</code> · <code>/yield solana</code> · <code>/yield aave base</code>: find a yield\n` +
    `<code>/yieldwatch &lt;id&gt;</code>: get a ping here if it drops, deposits leave, or withdrawals get stuck\n` +
    `<code>/yieldwatching</code>: your list\n\n` +
    `Full map, risk scores and the on-chain proof: ${SITE_YIELD}\n<i>Not financial advice.</i>`
  );
}

async function subscribe(ctx: Context, id: string): Promise<void> {
  const userId = ctx.from?.id;
  const chatId = ctx.chat?.id;
  if (!userId || !chatId) return;
  const o = yieldStore.snapshot()?.opportunities.find((x) => x.id === id);
  if (!o) {
    await ctx.reply(`I don't know <code>${esc(id)}</code>. Try <code>/yield usdc</code> to find an id.`, HTML);
    return;
  }
  const r = yieldWatchStore.add({ userId, chatId, id, baseline: baselineOf(o) }, Date.now());
  const msg =
    r === "added"
      ? `👁 Watching <b>${esc(o.symbol)}</b> (${esc(o.protocol)}, ${chainLabel(o.chain)}), now ${o.apy == null ? "measuring" : pctText(o.apy)}.\nI'll ping you here if the APY halves, deposits fall 30%, or withdrawals get stuck.\n\n${cardUrl(o.id)}`
      : r === "exists"
        ? `You already watch <b>${esc(o.symbol)}</b>. <code>/yieldwatching</code> shows your list.`
        : `You're watching ${YIELD_WATCH_CAP} yields, the limit. <code>/yieldunwatch &lt;id&gt;</code> frees a slot.`;
  await ctx.reply(msg, HTML);
}

// Website button: t.me/<bot>?start=yield_<id>. Other start payloads (referrals) continue to the main handler.
yieldCommands.command("start", async (ctx, next) => {
  const id = parseYieldPayload(String(ctx.match ?? ""));
  if (!id) return next();
  await subscribe(ctx, id);
});

yieldCommands.command("yield", async (ctx) => {
  const snap = yieldStore.snapshot();
  if (!snap) {
    await ctx.reply("Yield data is still loading; the first reading arrives within the hour.", HTML);
    return;
  }
  const q = String(ctx.match ?? "").trim();
  if (!q) {
    await ctx.reply(summaryText(snap), HTML);
    return;
  }
  const hits = searchYield(snap, q);
  await ctx.reply(
    hits.length
      ? `📈 <b>Yield X-Ray: ${esc(q)}</b>\n\n${hits.map(formatYieldLine).join("\n")}\n\nWatch one: <code>/yieldwatch ${hits[0].id}</code>`
      : `Nothing matches <b>${esc(q)}</b>. Try <code>/yield usdc</code>, <code>/yield solana</code> or see ${SITE_YIELD}`,
    HTML
  );
});

yieldCommands.command("yieldwatch", async (ctx) => {
  const id = String(ctx.match ?? "").trim().toLowerCase();
  if (!ID_RE.test(id)) {
    await ctx.reply("Send the id from a card or from <code>/yield</code>, e.g. <code>/yieldwatch base-aave-v3-usdc</code>.", HTML);
    return;
  }
  await subscribe(ctx, id);
});

yieldCommands.command("yieldwatching", async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;
  const mine = yieldWatchStore.forUser(userId);
  if (!mine.length) {
    await ctx.reply("You don't watch any yields yet. Find one with <code>/yield usdc</code>, then <code>/yieldwatch &lt;id&gt;</code>.", HTML);
    return;
  }
  const byId = new Map((yieldStore.snapshot()?.opportunities ?? []).map((o) => [o.id, o]));
  const lines = mine.map((w) => {
    const o = byId.get(w.id);
    return o ? formatYieldLine(o) : `• <code>${esc(w.id)}</code> (no longer tracked)`;
  });
  await ctx.reply(`👁 <b>Your yield watches (${mine.length}/${YIELD_WATCH_CAP})</b>\n\n${lines.join("\n")}`, HTML);
});

yieldCommands.command("yieldunwatch", async (ctx) => {
  const userId = ctx.from?.id;
  const id = String(ctx.match ?? "").trim().toLowerCase();
  if (!userId) return;
  await ctx.reply(yieldWatchStore.remove(userId, id) ? `Stopped watching <code>${esc(id)}</code>.` : `You weren't watching <code>${esc(id)}</code>.`, HTML);
});
