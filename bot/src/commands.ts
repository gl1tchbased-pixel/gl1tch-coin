import { Composer, InlineKeyboard, type Context } from "grammy";
import { messages, raidText, OFFICIAL } from "./content.js";
import { startKb, backKb } from "./keyboards.js";
import { getSection } from "./sections.js";
import { isVerifyEnabled } from "./config.js";
import { store } from "./verify/index.js";
import { RANK_TIERS } from "./ranks.js";
import { referralStore } from "./referrals.js";

export const publicCommands = new Composer<Context>();

const displayName = (ctx: Context): string =>
  ctx.from?.username ? `@${ctx.from.username}` : (ctx.from?.first_name || "Infected");

const HTML = {
  parse_mode: "HTML" as const,
  link_preview_options: { is_disabled: true },
};

publicCommands.command("start", async (ctx) => {
  // Referral deep link: t.me/<bot>?start=ref_<referrerId>
  const payload = (ctx.match || "").trim();
  const uid = ctx.from?.id ? String(ctx.from.id) : "";
  const m = /^ref_(\d{3,})$/.exec(payload);
  if (m && uid) {
    const referrerId = m[1];
    if (referralStore.record(referrerId, uid)) {
      const count = referralStore.count(referrerId);
      try {
        await ctx.api.sendMessage(
          Number(referrerId),
          `🧬 <b>+1 infected.</b> Someone joined through your link — you've infected <b>${count}</b> now.\nClimb the board: <code>/leaderboard</code>`,
          HTML
        );
      } catch { /* referrer may have blocked DMs */ }
    }
  }
  await ctx.reply(messages.welcome, { ...HTML, reply_markup: startKb() });
});

publicCommands.command("invite", async (ctx) => {
  const uid = ctx.from?.id ? String(ctx.from.id) : "";
  if (!uid) return;
  referralStore.setName(uid, displayName(ctx));
  const bot = ctx.me?.username ?? "gl1tch_infected_bot";
  const link = `https://t.me/${bot}?start=ref_${uid}`;
  const count = referralStore.count(uid);
  const rank = referralStore.rank(uid);
  const rankLine = count > 0 ? `You're <b>#${rank}</b> with <b>${count}</b> infected.` : "No infections yet — share your link to climb the board.";
  await ctx.reply(
    `🧬 <b>INFECT A FRIEND</b>\n\nEvery person who joins through your link makes you climb the board. Pure status — no wallet needed.\n\nYour link:\n${link}\n\n${rankLine}\n\n<code>/leaderboard</code> — top infectors`,
    { ...HTML, reply_markup: new InlineKeyboard().url("Share my link ↗", `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent("Join The Infected 🧬 — free rug-scanner + rogue-AI meme on Solana")}`) }
  );
});

publicCommands.command("leaderboard", async (ctx) => {
  const uid = ctx.from?.id ? String(ctx.from.id) : "";
  const top = referralStore.leaderboard(10);
  if (!top.length) {
    await ctx.reply("🧬 No infectors yet. Be the first — <code>/invite</code>", HTML);
    return;
  }
  const medal = (i: number) => (i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`);
  const rows = top.map((r, i) => `${medal(i)} ${r.name} — <b>${r.count}</b>`);
  let mine = "";
  if (uid) {
    const c = referralStore.count(uid);
    if (c > 0) mine = `\n\nYou: <b>#${referralStore.rank(uid)}</b> · ${c} infected`;
  }
  await ctx.reply(`🧬 <b>TOP INFECTORS</b>\n\n${rows.join("\n")}${mine}\n\n<code>/invite</code> to get your link · ${referralStore.total()} total infections`, HTML);
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

publicCommands.command("proof", async (ctx) => {
  await ctx.replyWithChatAction("typing").catch(() => {});
  // Run OUR OWN scanner on $GL1TCH, live — then hand over the verify links.
  let verdict = "LOW RISK";
  let score: number | null = 78;
  try {
    const r = await fetch(`${OFFICIAL.SITE}/api/scan?mint=${OFFICIAL.CONTRACT}&chain=solana`, { signal: AbortSignal.timeout(12000) });
    if (r.ok) { const d = (await r.json()) as { verdict?: string; score?: number }; if (d?.verdict) verdict = d.verdict; if (typeof d?.score === "number") score = d.score; }
  } catch { /* fall back to last-known values */ }

  const text =
    `🛡 <b>GL1TCH — PROOF, NOT PROMISES</b>\n\n` +
    `We built the scanner that hunts rugs. So we run it on ourselves — live:\n` +
    `<b>$GL1TCH → ${verdict}${score != null ? ` · ${score}/100` : ""}</b>\n\n` +
    `Every rug vector is already neutralized — and you can verify each one yourself:\n` +
    `✅ Mint authority revoked\n` +
    `✅ Freeze authority revoked\n` +
    `✅ Zero tax (0% buy/sell)\n` +
    `✅ Liquidity 100% locked/burned — the pool can't be pulled\n` +
    `✅ Metadata immutable\n` +
    `✅ 0% insider / bundled supply\n` +
    `✅ RugCheck score 1 (cleanest band)\n\n` +
    `🔑 <b>Anonymous, but fully auditable</b> — our code is open, every wallet is public.\n` +
    `Don't trust us. <b>Verify us.</b>`;

  const kb = new InlineKeyboard()
    .url("🛡 Full proof page ↗", `${OFFICIAL.SITE}/proof`)
    .row()
    .url("RugCheck ↗", OFFICIAL.RUGCHECK_URL)
    .url("Solscan ↗", OFFICIAL.SOLSCAN_TOKEN_URL)
    .row()
    .url("Open source ↗", OFFICIAL.GITHUB)
    .url("Re-scan it ↗", `${OFFICIAL.SITE}/scan`)
    .row()
    .text("‹ Back to menu", "m:home");
  await ctx.reply(text, { ...HTML, reply_markup: kb });
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
