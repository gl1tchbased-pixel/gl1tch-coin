import { Composer, type Context } from "grammy";
import { adminOnly } from "./middleware.js";
import { runDailyPost } from "./agent/index.js";
import { runContentBatch, runDiscoverySweep, runFullSweep, runRedditAngle } from "./agent/x-agent/index.js";
import { buildReply } from "./agent/x-agent/content.js";
import { extractTweetId, intentReply, intentTweet } from "./agent/x-agent/intent.js";
import { summary as perfSummary } from "./agent/x-agent/perf.js";
import { getHolderCount } from "./agent/x-agent/holders.js";
import { REPLY_PACK, PACK_HEADER } from "./agent/x-agent/replypack.js";
import {
  KOL_HEADER,
  KOL_VETTING_CARD,
  KOL_TEMPLATES,
  KOL_FOOTER,
} from "./agent/x-agent/koltemplates.js";
import {
  REDDIT_HEADER,
  REDDIT_POSTS,
  REDDIT_FOOTER,
} from "./agent/x-agent/redditpack.js";
import {
  GENESIS_HEADER,
  GENESIS_CARDS,
  GENESIS_FOOTER,
} from "./agent/x-agent/genesis.js";

export const adminCommands = new Composer<Context>();

// All admin commands are gated and logged.
adminCommands.use(adminOnly);

function logAdmin(ctx: Context, action: string, detail = "") {
  console.log(`[admin] ${action} by=${ctx.from?.id} ${detail}`);
}

adminCommands.command("announce", async (ctx) => {
  const text = ctx.match?.toString().trim();
  if (!text) {
    await ctx.reply("Usage: /announce <message>");
    return;
  }
  logAdmin(ctx, "announce", text.slice(0, 80));
  await ctx.reply(`📡 ANNOUNCEMENT\n\n${text}`);
});

adminCommands.command("pin", async (ctx) => {
  const replyTo = ctx.message?.reply_to_message?.message_id;
  if (!replyTo) {
    await ctx.reply("Reply to a message with /pin to pin it.");
    return;
  }
  logAdmin(ctx, "pin", String(replyTo));
  try {
    await ctx.api.pinChatMessage(ctx.chat!.id, replyTo);
    await ctx.reply("Pinned.");
  } catch {
    await ctx.reply("Could not pin (need admin rights in this chat).");
  }
});

adminCommands.command("warn", async (ctx) => {
  const target = ctx.message?.reply_to_message?.from;
  if (!target) {
    await ctx.reply("Reply to a user's message with /warn <reason>.");
    return;
  }
  const reason = ctx.match?.toString().trim() || "violating the rules";
  logAdmin(ctx, "warn", `target=${target.id}`);
  await ctx.reply(`⚠ Warning issued to ${target.first_name} for ${reason}.`);
});

adminCommands.command("mute", async (ctx) => {
  const target = ctx.message?.reply_to_message?.from;
  if (!target) {
    await ctx.reply("Reply to a user's message with /mute to mute them.");
    return;
  }
  logAdmin(ctx, "mute", `target=${target.id}`);
  try {
    await ctx.api.restrictChatMember(ctx.chat!.id, target.id, {
      can_send_messages: false,
    });
    await ctx.reply(`🔇 Muted ${target.first_name}.`);
  } catch {
    await ctx.reply("Could not mute (need admin rights).");
  }
});

adminCommands.command("ban", async (ctx) => {
  const target = ctx.message?.reply_to_message?.from;
  if (!target) {
    await ctx.reply("Reply to a user's message with /ban to ban them.");
    return;
  }
  logAdmin(ctx, "ban", `target=${target.id}`);
  try {
    await ctx.api.banChatMember(ctx.chat!.id, target.id);
    await ctx.reply(`⛔ Banned ${target.first_name}.`);
  } catch {
    await ctx.reply("Could not ban (need admin rights).");
  }
});

adminCommands.command("chatid", async (ctx) => {
  logAdmin(ctx, "chatid", String(ctx.chat?.id));
  await ctx.reply(
    `Chat ID: <code>${ctx.chat?.id}</code>\nType: ${ctx.chat?.type}\n\nUse this as AGENT_CHANNEL_ID (and add the bot as admin here).`,
    { parse_mode: "HTML" }
  );
});

adminCommands.command("agentpreview", async (ctx) => {
  logAdmin(ctx, "agentpreview");
  await ctx.reply("Generating today's preview…");
  await runDailyPost(ctx.api, { live: false });
});

adminCommands.command("agentpost", async (ctx) => {
  logAdmin(ctx, "agentpost");
  await ctx.reply("Posting now (live)…");
  await runDailyPost(ctx.api, { live: true });
});

// ---- X Agent (human-in-the-loop, free, ban-proof) ----

adminCommands.command("xcontent", async (ctx) => {
  const n = Number(ctx.match?.toString().trim()) || 3;
  logAdmin(ctx, "xcontent", `n=${n}`);
  await ctx.reply(`Generating ${n} variant${n === 1 ? "" : "s"}…`);
  await runContentBatch(ctx.api, { count: Math.min(8, Math.max(1, n)) });
});

adminCommands.command("xsweep", async (ctx) => {
  logAdmin(ctx, "xsweep");
  await ctx.reply("Scanning Nitter · Reddit · DexScreener…");
  await runDiscoverySweep(ctx.api, { top: 5 });
});

adminCommands.command("xfull", async (ctx) => {
  logAdmin(ctx, "xfull");
  await ctx.reply("Running full cycle (ratings + holders + X + discovery + reddit angle)…");
  await runFullSweep(ctx.api, { variants: 3, opportunities: 5 });
});

adminCommands.command("xrcomment", async (ctx) => {
  logAdmin(ctx, "xrcomment");
  await runRedditAngle(ctx.api);
});

/** /xpack — DMs the admin 15 curated Solana account reply cards.
 *  Each card has @handle, trigger, copy-ready reply text, and an
 *  "Open X profile" button for one-tap navigation. */
adminCommands.command("xpack", async (ctx) => {
  logAdmin(ctx, "xpack");
  const escHtml = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  await ctx.api.sendMessage(ctx.from!.id, PACK_HEADER, {
    parse_mode: "HTML",
    link_preview_options: { is_disabled: true },
  });
  for (const t of REPLY_PACK) {
    const text =
      `<b>@${escHtml(t.handle)}</b> · <i>${escHtml(t.bio)}</i>\n\n` +
      `<i>Trigger:</i> ${escHtml(t.trigger)}\n\n` +
      `<pre>${escHtml(t.reply)}</pre>`;
    await ctx.api.sendMessage(ctx.from!.id, text, {
      parse_mode: "HTML",
      link_preview_options: { is_disabled: true },
      reply_markup: {
        inline_keyboard: [
          [{ text: `🔗 Open @${t.handle}`, url: `https://x.com/${t.handle}` }],
        ],
      },
    });
  }
  await ctx.reply("Reply pack delivered — 15 cards above.");
});

/** /xkol — DMs the admin the KOL outreach playbook: budget framework,
 *  30-sec vetting checklist, 5 copy-ready DM templates, and a workflow. */
adminCommands.command("xkol", async (ctx) => {
  logAdmin(ctx, "xkol");
  const escHtml = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const sendHtml = (text: string) =>
    ctx.api.sendMessage(ctx.from!.id, text, {
      parse_mode: "HTML",
      link_preview_options: { is_disabled: true },
    });

  await sendHtml(KOL_HEADER);
  await sendHtml(KOL_VETTING_CARD);
  for (const t of KOL_TEMPLATES) {
    const text =
      `<b>${escHtml(t.title)}</b>\n\n` +
      `<i>When:</i> ${escHtml(t.when)}\n\n` +
      `<pre>${escHtml(t.body)}</pre>`;
    await ctx.api.sendMessage(ctx.from!.id, text, {
      parse_mode: "HTML",
      link_preview_options: { is_disabled: true },
    });
  }
  await sendHtml(KOL_FOOTER);
  await ctx.reply("KOL playbook delivered above — 5 templates + vetting + workflow.");
});

/** /xreddit — DMs the admin 4 subreddit-tuned post drafts (free growth). */
adminCommands.command("xreddit", async (ctx) => {
  logAdmin(ctx, "xreddit");
  const escHtml = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const sendHtml = (text: string) =>
    ctx.api.sendMessage(ctx.from!.id, text, {
      parse_mode: "HTML",
      link_preview_options: { is_disabled: true },
    });

  await sendHtml(REDDIT_HEADER);
  for (const p of REDDIT_POSTS) {
    const text =
      `<b>r/${escHtml(p.sub)}</b>\n` +
      `<i>${escHtml(p.notes)}</i>\n\n` +
      `<b>Title:</b>\n<pre>${escHtml(p.title)}</pre>\n\n` +
      `<b>Body:</b>\n<pre>${escHtml(p.body)}</pre>`;
    await ctx.api.sendMessage(ctx.from!.id, text, {
      parse_mode: "HTML",
      link_preview_options: { is_disabled: true },
      reply_markup: {
        inline_keyboard: [[{ text: `📝 Open r/${p.sub} submit page`, url: p.url }]],
      },
    });
  }
  await sendHtml(REDDIT_FOOTER);
  await ctx.reply("Reddit pack delivered — 4 posts above.");
});

/** /xgenesis — DMs the admin the Genesis 100 campaign kit (free FOMO play). */
adminCommands.command("xgenesis", async (ctx) => {
  logAdmin(ctx, "xgenesis");
  const escHtml = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const sendHtml = (text: string) =>
    ctx.api.sendMessage(ctx.from!.id, text, {
      parse_mode: "HTML",
      link_preview_options: { is_disabled: true },
    });

  await sendHtml(GENESIS_HEADER);
  for (const c of GENESIS_CARDS) {
    const text =
      `<b>${escHtml(c.title)}</b>\n\n` +
      `<i>When:</i> ${escHtml(c.when)}\n\n` +
      `<pre>${escHtml(c.body)}</pre>`;
    await sendHtml(text);
  }
  await sendHtml(GENESIS_FOOTER);
  await ctx.reply("Genesis 100 kit delivered — 4 cards above.");
});

adminCommands.command("xholders", async (ctx) => {
  logAdmin(ctx, "xholders");
  await ctx.reply("Querying on-chain holder count…");
  try {
    const n = await getHolderCount();
    await ctx.reply(`<b>HOLDER COUNT</b>\n\nCurrent: <b>${n}</b>\n<i>Source: Solana RPC (live)</i>`, { parse_mode: "HTML" });
  } catch (err) {
    await ctx.reply(`Holder count query failed: ${(err as Error).message}`);
  }
});

adminCommands.command("xstats", async (ctx) => {
  logAdmin(ctx, "xstats");
  const rows = perfSummary();
  if (rows.length === 0) {
    await ctx.reply("No posts logged yet. Posted variants will appear here after rating.");
    return;
  }
  rows.sort((a, b) => b.weight - a.weight);
  const lines = rows.map(
    (r) =>
      `<b>${r.category}</b> · w=${r.weight.toFixed(2)} · 🔥${r.hot} 👍${r.ok} 🥱${r.weak} · pending ${r.pending}`,
  );
  await ctx.reply(`<b>X AGENT — PERFORMANCE</b>\n\n${lines.join("\n")}`, { parse_mode: "HTML" });
});

/** /xreply <X tweet URL> — manual engagement helper.
 *  X public API + Nitter scraping are dead. To reply to a real X tweet, paste its
 *  URL here; bot returns a Telegram message with "🐦 Reply via X" deep-link that
 *  opens the X composer with the in-reply-to set and a brand-correct draft text. */
adminCommands.command("xreply", async (ctx) => {
  const url = ctx.match?.toString().trim() ?? "";
  const tweetId = extractTweetId(url);
  if (!tweetId) {
    await ctx.reply(
      "Usage: <code>/xreply &lt;X tweet URL&gt;</code>\n\nExample: /xreply https://x.com/handle/status/1234567890",
      { parse_mode: "HTML" },
    );
    return;
  }
  logAdmin(ctx, "xreply", `tweet=${tweetId}`);
  const seed = Math.floor(Date.now() / 1000);
  const reply = buildReply(seed);
  const replyUrl = intentReply(tweetId, reply.text);
  const tweetAboutUrl = intentTweet(reply.text);
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  await ctx.reply(
    `<b>🎯 REPLY DRAFT</b>\n\n<b>Target tweet:</b> ${esc(url)}\n\n<b>Suggested reply:</b>\n<pre>${esc(reply.text)}</pre>`,
    {
      parse_mode: "HTML",
      link_preview_options: { is_disabled: true },
      reply_markup: {
        inline_keyboard: [
          [{ text: "🐦 Reply via X", url: replyUrl }],
          [
            { text: "🐦 Tweet about", url: tweetAboutUrl },
            { text: "✅ Replied", callback_data: "xq:noop" },
          ],
        ],
      },
    },
  );
});

adminCommands.command("incident", async (ctx) => {
  const text = ctx.match?.toString().trim();
  logAdmin(ctx, "incident", text?.slice(0, 80) ?? "");
  await ctx.reply(
    `🚨 INCIDENT LOGGED\n\n${text || "(no detail)"}\n\nReminder to the community: admins never DM first; verify all links via /links.`
  );
});
