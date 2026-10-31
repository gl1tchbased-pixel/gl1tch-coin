import { Composer, InlineKeyboard, type Context } from "grammy";
import { OFFICIAL } from "../content.js";
import { config } from "../config.js";
import { guardianStore, FREE_DAILY_GROUP_SCANS } from "./store.js";

export const guardianCommands = new Composer<Context>();

const HTML = {
  parse_mode: "HTML" as const,
  link_preview_options: { is_disabled: true },
};

export function officialGroups(): string[] {
  return [config.groupId, config.agent.channelId].filter(Boolean);
}

function buildAddGroupKb(botUsername = "gl1tch_infected_bot"): InlineKeyboard {
  return new InlineKeyboard()
    .url("➕ Add GL1TCH Guardian to a Group ↗", `https://t.me/${botUsername}?startgroup=guardian`)
    .row()
    .url("🔍 Web Scanner ↗", `${OFFICIAL.SITE}/scan`)
    .url("🤖 x402 Agent API ↗", `${OFFICIAL.SITE}/agents/docs`);
}

export function formatGuardianDm(): string {
  return (
    `🛡 <b>GL1TCH GUARDIAN — TELEGRAM GROUP PROTECTION</b>\n\n` +
    `Add me to any Solana or EVM Telegram group. Whenever someone pastes a contract address in chat, I automatically reply with a live safety verdict (authorities, LP lock, honeypot tax, top holders, insider clusters).\n\n` +
    `• <b>Free for every group:</b> ${FREE_DAILY_GROUP_SCANS} automatic contract scans per group per day. No token needed.\n` +
    `• <b>Agent / x402 API:</b> Programmatic group bots can also call <code>GET /api/x402/scan</code> or <code>GET /api/x402/verdict</code>`
  );
}

// Intercept /start guardian deep links in DM or groups
guardianCommands.command("start", async (ctx, next) => {
  const payload = (ctx.match || "").trim();
  if (payload !== "guardian") return next();
  const botUser = ctx.me?.username || "gl1tch_infected_bot";
  if (ctx.chat?.type === "private") {
    await ctx.reply(formatGuardianDm(), {
      ...HTML,
      reply_markup: buildAddGroupKb(botUser),
    });
    return;
  }
  const st = guardianStore.getStatus(ctx.chat.id, officialGroups());
  await ctx.reply(
    `🛡 <b>GL1TCH GUARDIAN ACTIVE</b>\n\n` +
      `Paste any Solana or EVM contract address in this group and I'll auto-scan it.\n` +
      `Status: <b>${st.unlimited ? "🟢 UNLIMITED" : `🟢 FREE (${st.usedToday}/${st.limit} today)`}</b>`,
    { ...HTML, reply_markup: buildAddGroupKb(botUser) }
  );
});

guardianCommands.command("guardian", async (ctx) => {
  const botUser = ctx.me?.username || "gl1tch_infected_bot";
  const chatType = ctx.chat?.type;

  if (chatType === "private") {
    await ctx.reply(formatGuardianDm(), {
      ...HTML,
      reply_markup: buildAddGroupKb(botUser),
    });
    return;
  }

  if (chatType !== "group" && chatType !== "supergroup") return;

  const chatId = ctx.chat.id;
  const st = guardianStore.getStatus(chatId, officialGroups());
  const statusLine = st.official
    ? `🟢 <b>UNLIMITED</b> (Official GL1TCH Community)`
    : `🟢 <b>FREE</b> · <b>${st.usedToday}/${st.limit}</b> auto-scans used today`;

  await ctx.reply(
    `🛡 <b>GL1TCH GUARDIAN STATUS</b>\n\n` +
      `• Protection: ${statusLine}\n` +
      `• Today's Auto-Scans: <b>${st.usedToday}</b>`,
    { ...HTML, reply_markup: buildAddGroupKb(botUser) }
  );
});

