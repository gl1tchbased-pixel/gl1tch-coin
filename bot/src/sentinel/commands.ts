import { Composer, InlineKeyboard, type Context } from "grammy";
import { OFFICIAL } from "../content.js";
import { sentinelStore } from "./store.js";

export const sentinelCommands = new Composer<Context>();

const HTML = {
  parse_mode: "HTML" as const,
  link_preview_options: { is_disabled: true },
};

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function buildSentinelKb(): InlineKeyboard {
  const kb = new InlineKeyboard();
  kb.text("🔍 View Latest Clean Scans", "sentinel:feed")
    .url("🌐 Web Radar ↗", `${OFFICIAL.SITE}/radar`)
    .row()
    .url("⚡ Solana Blink ↗", `https://dial.to/?action=solana-action:${OFFICIAL.SITE}/api/actions/safe-swap`);
  return kb;
}

sentinelCommands.command("sentinel", async (ctx) => {
  await ctx.reply(
    `🛡️ <b>GL1TCH SENTINEL — CLEAN-SCAN FEED</b>\n\n` +
      `A convenience feed of Solana tokens from Rug Radar that scored 90+ with a known LP lock. A clean scan is not a recommendation and cannot rule out losses. Anyone can run the same scan for free with /scan. The feed is free for everyone.\n\n` +
      `• <b>Recent Clean Scans:</b> ${sentinelStore.getRecentGems().length} tokens`,
    {
      ...HTML,
      reply_markup: buildSentinelKb(),
    }
  );
});

sentinelCommands.callbackQuery("sentinel:feed", async (ctx) => {
  await ctx.answerCallbackQuery();
  const gems = sentinelStore.getRecentGems(3);
  if (!gems.length) {
    await ctx.reply(
      "🔍 <i>No clean scans in the last window. The feed only lists tokens scoring 90+. Check back shortly or browse /radar.</i>",
      HTML
    );
    return;
  }

  let text = "🔍 <b>RECENT CLEAN SCANS (Score 90+)</b>\n<i>Not a recommendation. A clean scan cannot rule out losses.</i>\n\n";
  for (const g of gems) {
    text +=
      `• <b>${esc(g.symbol)}</b> (${esc(g.name)}) · <b>${g.score}/100 ${esc(g.verdict)}</b>\n` +
      `  LP Locked: <b>${g.lpLockedPct}%</b> · CA: <code>${g.mint}</code>\n` +
      `  ⚡ <a href="${g.blinkUrl}">Safe Swap Blink →</a>\n\n`;
  }

  await ctx.reply(text, HTML);
});
