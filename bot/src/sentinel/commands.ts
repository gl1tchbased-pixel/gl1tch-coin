import { Composer, InlineKeyboard, type Context } from "grammy";
import { OFFICIAL } from "../content.js";
import { store as verifyStore } from "../verify/index.js";
import { sentinelStore } from "./store.js";

export const sentinelCommands = new Composer<Context>();

const HTML = {
  parse_mode: "HTML" as const,
  link_preview_options: { is_disabled: true },
};

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function buildSentinelKb(userId?: number): InlineKeyboard {
  const isSub = userId ? sentinelStore.isSubscribed(userId) : false;
  const kb = new InlineKeyboard();
  if (!isSub) {
    kb.text("⚡ Subscribe ($GL1TCH Holder Pass)", "sentinel:sub:holder")
      .row()
      .text("💳 Pay with x402 USDC ($15/mo)", "sentinel:sub:usdc")
      .row();
  }
  kb.text("🔍 View Latest Clean Scans", "sentinel:feed")
    .url("🌐 Web Radar ↗", `${OFFICIAL.SITE}/radar`)
    .row()
    .url("⚡ Solana Blink ↗", `https://dial.to/?action=solana-action:${OFFICIAL.SITE}/api/actions/safe-swap`);
  return kb;
}

sentinelCommands.command("sentinel", async (ctx) => {
  const uid = ctx.from?.id ?? 0;
  const sub = uid ? sentinelStore.getSubscriber(uid) : null;
  const statusLine = sub
    ? `🟢 <b>VIP SUBSCRIBER</b> (Plan: ${sub.plan.toUpperCase()} · Valid until ${new Date(sub.expiresAt).toISOString().slice(0, 10)})`
    : `⚪ <b>FREE TIER</b> (Public feed access)`;

  await ctx.reply(
    `🛡️ <b>GL1TCH SENTINEL — CLEAN-SCAN FEED</b>\n\n` +
      `A convenience feed of Solana tokens from Rug Radar that scored 90+ with a known LP lock. A clean scan is not a recommendation and cannot rule out losses. Anyone can run the same scan for free with /scan.\n\n` +
      `• <b>Your Status:</b> ${statusLine}\n` +
      `• <b>Recent Clean Scans:</b> ${sentinelStore.getRecentGems().length} tokens\n\n` +
      `<b>Membership Options:</b>\n` +
      `1️⃣ <b>$GL1TCH Holder Pass:</b> 100% Free if holding ≥250k $GL1TCH (verify in DM with <code>/verify</code>)\n` +
      `2️⃣ <b>x402 Agent USDC:</b> $15 USDC / month\n` +
      `3️⃣ <b>Telegram Stars:</b> 250 Stars / month`,
    {
      ...HTML,
      reply_markup: buildSentinelKb(uid),
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

  let text = "💎 <b>RECENT HIGH-CONVICTION GEMS (Score 90+)</b>\n\n";
  for (const g of gems) {
    text +=
      `• <b>${esc(g.symbol)}</b> (${esc(g.name)}) · <b>${g.score}/100 ${esc(g.verdict)}</b>\n` +
      `  LP Locked: <b>${g.lpLockedPct}%</b> · CA: <code>${g.mint}</code>\n` +
      `  ⚡ <a href="${g.blinkUrl}">One-Click Safe Swap Blink →</a>\n\n`;
  }

  await ctx.reply(text, HTML);
});

sentinelCommands.callbackQuery("sentinel:sub:holder", async (ctx) => {
  const uid = ctx.from.id;
  const v = verifyStore.getVerification(uid);
  if (!v || v.balance < 250_000) {
    const curBal = v ? v.balance.toLocaleString("en-US") : "0";
    await ctx.answerCallbackQuery({
      text: `Requires ≥250,000 $GL1TCH (You currently have ${curBal}). Run /verify to refresh.`,
      show_alert: true,
    });
    return;
  }

  sentinelStore.addSubscriber({
    userId: uid,
    username: ctx.from.username,
    plan: "holder",
    subscribedAt: Date.now(),
    expiresAt: Date.now() + 30 * 86_400_000,
  });

  await ctx.answerCallbackQuery({ text: "🎉 Holder VIP Pass Activated (30 Days)!" });
  await ctx.reply(
    `🎉 <b>SENTINEL VIP ACTIVATED</b>\n\n` +
      `Welcome to Sentinel VIP Alpha. Your verified holding of <code>${v.balance.toLocaleString("en-US")}</code> $GL1TCH unlocked 30 days of priority alert delivery.\n\n` +
      `Run <code>/sentinel</code> anytime to check the feed.`,
    HTML
  );
});

