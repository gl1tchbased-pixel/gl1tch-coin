import { Composer, InlineKeyboard, type Context } from "grammy";
import { OFFICIAL } from "../content.js";
import { config } from "../config.js";
import { store as verifyStore } from "../verify/index.js";
import { RANK_TIERS } from "../ranks.js";
import { guardianStore, FREE_DAILY_GROUP_SCANS } from "./store.js";

export const guardianCommands = new Composer<Context>();

const HTML = {
  parse_mode: "HTML" as const,
  link_preview_options: { is_disabled: true },
};

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

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

export function formatGuardianDm(userId?: number): string {
  const v = userId ? verifyStore.getVerification(userId) : null;
  const tier = v ? RANK_TIERS.find((t) => t.id === v.tierId) : null;
  const holderLine =
    v && v.balance > 0
      ? `✅ <b>Your Verified Rank:</b> ${esc(tier?.rank ?? v.tierId)} (<code>${v.balance.toLocaleString("en-US")}</code> $GL1TCH)\n<i>You can unlock Unlimited Guardian in any group you admin with <code>/guardian unlock</code>.</i>`
      : `⚪ <b>Your Wallet Status:</b> Not verified yet.\n<i>Run <code>/verify</code> here in DM (free off-chain signature) while holding $GL1TCH to unlock Unlimited Guardian for your groups.</i>`;

  return (
    `🛡 <b>GL1TCH GUARDIAN — TELEGRAM GROUP PROTECTION</b>\n\n` +
    `Add me to any Solana or EVM Telegram group. Whenever someone pastes a contract address in chat, I automatically reply with a live safety verdict (authorities, LP lock, honeypot tax, top holders, insider clusters).\n\n` +
    `• <b>Free Tier:</b> ${FREE_DAILY_GROUP_SCANS} automatic contract scans per group per day\n` +
    `• <b>Holder Tier (Unlimited):</b> Free unlimited auto-scans when any group admin verifies a $GL1TCH holding via <code>/verify</code> and runs <code>/guardian unlock</code> in the group\n` +
    `• <b>Agent / x402 API:</b> Programmatic group bots can also call <code>GET /api/x402/scan</code> or <code>GET /api/x402/verdict</code>\n\n` +
    holderLine
  );
}

// Intercept /start guardian deep links in DM or groups
guardianCommands.command("start", async (ctx, next) => {
  const payload = (ctx.match || "").trim();
  if (payload !== "guardian") return next();
  const botUser = ctx.me?.username || "gl1tch_infected_bot";
  if (ctx.chat?.type === "private") {
    await ctx.reply(formatGuardianDm(ctx.from?.id), {
      ...HTML,
      reply_markup: buildAddGroupKb(botUser),
    });
    return;
  }
  const st = guardianStore.getStatus(ctx.chat.id, officialGroups());
  await ctx.reply(
    `🛡 <b>GL1TCH GUARDIAN ACTIVE</b>\n\n` +
      `Paste any Solana or EVM contract address in this group and I'll auto-scan it.\n` +
      `Status: <b>${st.unlimited ? "🟢 UNLIMITED" : `🟡 FREE TIER (${st.usedToday}/${st.limit} today)`}</b>\n\n` +
      `Group admins holding $GL1TCH can unlock unlimited scans with <code>/guardian unlock</code>.`,
    { ...HTML, reply_markup: buildAddGroupKb(botUser) }
  );
});

guardianCommands.command("guardian", async (ctx) => {
  const botUser = ctx.me?.username || "gl1tch_infected_bot";
  const chatType = ctx.chat?.type;

  if (chatType === "private") {
    await ctx.reply(formatGuardianDm(ctx.from?.id), {
      ...HTML,
      reply_markup: buildAddGroupKb(botUser),
    });
    return;
  }

  if (chatType !== "group" && chatType !== "supergroup") return;

  const sub = (ctx.match || "").trim().toLowerCase();
  const chatId = ctx.chat.id;

  if (sub === "unlock") {
    if (!ctx.from) return;
    let isAdmin = config.adminIds.includes(ctx.from.id);
    if (!isAdmin) {
      try {
        const member = await ctx.api.getChatMember(chatId, ctx.from.id);
        isAdmin = member.status === "creator" || member.status === "administrator";
      } catch {
        isAdmin = false;
      }
    }

    if (!isAdmin) {
      await ctx.reply(
        "⚠️ Only a group administrator can run <code>/guardian unlock</code>.",
        HTML
      );
      return;
    }

    const v = verifyStore.getVerification(ctx.from.id);
    if (!v || v.balance <= 0) {
      const dmLink = `https://t.me/${botUser}?start=guardian`;
      await ctx.reply(
        `🛡 <b>UNLOCK UNLIMITED GUARDIAN</b>\n\n` +
          `To unlock unlimited auto-scans for this group:\n` +
          `1. Hold <b>$GL1TCH</b> in your Solana wallet (<code>${OFFICIAL.CONTRACT}</code>)\n` +
          `2. Open a DM with <a href="${dmLink}">@${esc(botUser)}</a> and run <code>/verify</code> (free off-chain message signature)\n` +
          `3. Come back here and run <code>/guardian unlock</code>`,
        {
          ...HTML,
          reply_markup: new InlineKeyboard().url("1️⃣ Verify Wallet in DM ↗", dmLink),
        }
      );
      return;
    }

    const tier = RANK_TIERS.find((t) => t.id === v.tierId);
    const uname = ctx.from.username ? `@${ctx.from.username}` : ctx.from.first_name || "Admin";
    guardianStore.unlockGroup(chatId, {
      userId: ctx.from.id,
      username: uname,
      tierId: v.tierId,
      balance: v.balance,
    });

    await ctx.reply(
      `🛡 <b>GL1TCH GUARDIAN PRO — UNLOCKED</b>\n\n` +
        `This group now has <b>UNLIMITED</b> automatic contract safety scans.\n` +
        `• Unlocked by: <b>${esc(uname)}</b>\n` +
        `• Verified Rank: <b>${esc(tier?.rank ?? v.tierId)}</b> (<code>${v.balance.toLocaleString("en-US")}</code> $GL1TCH)\n\n` +
        `<i>Paste any Solana or EVM token contract in chat to scan it automatically.</i>`,
      { ...HTML, reply_markup: buildAddGroupKb(botUser) }
    );
    return;
  }

  const st = guardianStore.getStatus(chatId, officialGroups());
  const statusLine = st.official
    ? `🟢 <b>UNLIMITED</b> (Official GL1TCH Community)`
    : st.unlimited
      ? `🟢 <b>UNLIMITED · HOLDER VERIFIED</b> (Unlocked by ${esc(st.unlockedByUsername || "Admin")} · <code>${(st.unlockedBalance ?? 0).toLocaleString("en-US")}</code> $GL1TCH)`
      : `🟡 <b>FREE TIER</b> · <b>${st.usedToday}/${st.limit}</b> auto-scans used today`;

  const unlockHint = st.unlimited
    ? `<i>Every contract pasted in this group is scanned automatically with no daily cap.</i>`
    : `💡 <b>Want unlimited group protection?</b>\nAny group admin holding <b>$GL1TCH</b> can verify in DM (<code>/verify</code>) and run <code>/guardian unlock</code> here — 100% free for holders.`;

  await ctx.reply(
    `🛡 <b>GL1TCH GUARDIAN STATUS</b>\n\n` +
      `• Protection: ${statusLine}\n` +
      `• Today's Auto-Scans: <b>${st.usedToday}</b>\n\n` +
      unlockHint,
    { ...HTML, reply_markup: buildAddGroupKb(botUser) }
  );
});

