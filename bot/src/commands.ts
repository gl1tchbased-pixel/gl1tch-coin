import { Composer, InlineKeyboard, type Context } from "grammy";
import { messages, raidText, OFFICIAL } from "./content.js";
import { startKb, backKb } from "./keyboards.js";
import { getSection } from "./sections.js";
import { isVerifyEnabled } from "./config.js";
import { store } from "./verify/index.js";
import { RANK_TIERS } from "./ranks.js";

export const publicCommands = new Composer<Context>();

const HTML = {
  parse_mode: "HTML" as const,
  link_preview_options: { is_disabled: true },
};

publicCommands.command("start", async (ctx) => {
  await ctx.reply(messages.welcome, { ...HTML, reply_markup: startKb() });
});

publicCommands.command("menu", async (ctx) => {
  const s = getSection("home");
  await ctx.reply(s.text, { ...HTML, reply_markup: s.kb });
});

publicCommands.command("rank", async (ctx) => {
  const s = getSection("rank");
  await ctx.reply(s.text, { ...HTML, reply_markup: s.kb });
});

publicCommands.command("verify", async (ctx) => {
  if (!ctx.from) return;
  if (!isVerifyEnabled) {
    await ctx.reply(
      "<b>RANK VERIFICATION</b>\n\n<i>Activates at launch.</i> Once $GL1TCH is live, link your wallet here to unlock your tier and gated rooms. No funds ever leave your control — you only sign a free message.",
      { ...HTML, reply_markup: backKb() }
    );
    return;
  }
  const nonce = store.issueNonce(ctx.from.id, ctx.from.username);
  const url = `${OFFICIAL.SITE}/verify?n=${nonce}`;
  const kb = new InlineKeyboard().url("Link wallet & verify ↗", url).row().text("‹ Back to menu", "m:home");
  await ctx.reply(
    "<b>VERIFY YOUR RANK</b>\n\n" +
      "Open the link below, connect your Solana wallet, and sign the message. This is free, off-chain, and grants <b>no</b> spending access — it only proves you hold $GL1TCH.\n\n" +
      "Your rank and single-use room links arrive here in your DMs.\n\n" +
      "<i>This link is valid for 10 minutes and one use.</i>",
    { ...HTML, reply_markup: kb }
  );
});

publicCommands.command("myrank", async (ctx) => {
  if (!ctx.from) return;
  const v = store.getVerification(ctx.from.id);
  if (!v) {
    await ctx.reply(
      "You haven't verified yet. Use /verify to link your wallet and claim your tier.",
      { ...HTML, reply_markup: backKb() }
    );
    return;
  }
  const tier = RANK_TIERS.find((t) => t.id === v.tierId);
  await ctx.reply(
    `<b>YOUR RANK</b>\n\n◆ <b>${tier?.rank ?? v.tierId}</b>\n` +
      `Balance at verification: <code>${v.balance.toLocaleString("en-US")}</code> $GL1TCH\n` +
      `Unlocks: <i>${tier?.unlocks ?? ""}</i>\n\n` +
      "<i>Holdings change — re-run /verify to refresh your tier.</i>",
    { ...HTML, reply_markup: backKb() }
  );
});

publicCommands.command("lore", async (ctx) => {
  const s = getSection("lore", 0);
  await ctx.reply(s.text, { ...HTML, reply_markup: s.kb });
});

publicCommands.command("faq", async (ctx) => {
  const s = getSection("faq");
  await ctx.reply(s.text, { ...HTML, reply_markup: s.kb });
});

publicCommands.command("rules", async (ctx) => {
  const s = getSection("rules");
  await ctx.reply(s.text, { ...HTML, reply_markup: s.kb });
});

publicCommands.command("links", async (ctx) => {
  const s = getSection("links");
  await ctx.reply(s.text, { ...HTML, reply_markup: s.kb });
});

publicCommands.command("raid", async (ctx) => {
  const kb = new InlineKeyboard()
    .url("Open X ↗", OFFICIAL.X)
    .row()
    .text("‹ Back to menu", "m:home");
  await ctx.reply(raidText(), { ...HTML, reply_markup: kb });
});

publicCommands.command("submit", async (ctx) => {
  await ctx.reply(messages.submitPrompt, { ...HTML, reply_markup: backKb() });
});

publicCommands.command("support", async (ctx) => {
  await ctx.reply(messages.support, { ...HTML, reply_markup: backKb() });
});
