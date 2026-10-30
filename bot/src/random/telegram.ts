import { Composer, InlineKeyboard, type Context } from "grammy";
import { OFFICIAL } from "../content.js";
import { store as verifyStore } from "../verify/index.js";
import { RANK_TIERS } from "../ranks.js";
import { requestRandom, getRandom, type PublicRecord } from "./service.js";

export const giveawayCommands = new Composer<Context>();

const HTML = {
  parse_mode: "HTML" as const,
  link_preview_options: { is_disabled: true },
};

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export type ParsedGiveaway =
  | { ok: true; mode: "labels"; winners: number; labels: string[] }
  | { ok: true; mode: "tickets"; winners: number; totalTickets: number }
  | { ok: false; error: string };

/**
 * Parse `/giveaway` arguments:
 * - `/giveaway 2 @alice @bob @charlie` -> 2 winners from named list
 * - `/giveaway @alice @bob @charlie`   -> 1 winner from named list
 * - `/giveaway 100`                    -> 1 winning ticket from #1..#100
 * - `/giveaway 3 100`                  -> 3 winning tickets from #1..#100
 */
export function parseGiveawayArgs(raw: string): ParsedGiveaway {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: false, error: "empty" };
  }

  // Ticket mode: `<total>` or `<winners> <total>` where both are positive integers
  const intMatch = /^(\d+)(?:\s+(\d+))?$/.exec(trimmed);
  if (intMatch) {
    const a = Number(intMatch[1]);
    const b = intMatch[2] ? Number(intMatch[2]) : null;
    const winners = b !== null ? a : 1;
    const totalTickets = b !== null ? b : a;
    if (totalTickets < 2 || totalTickets > 10_000) {
      return { ok: false, error: "Ticket count must be between 2 and 10,000." };
    }
    if (winners < 1 || winners > 50 || winners >= totalTickets) {
      return { ok: false, error: `Winner count must be between 1 and ${Math.min(50, totalTickets - 1)}.` };
    }
    return { ok: true, mode: "tickets", winners, totalTickets };
  }

  // Named entrants mode: optional leading winner count + space/comma/newline separated tokens
  const tokens = trimmed
    .split(/[\s,]+/)
    .map((t) => t.trim())
    .filter(Boolean);

  let winners = 1;
  let startIdx = 0;
  if (tokens.length >= 3 && /^\d+$/.test(tokens[0])) {
    winners = Number(tokens[0]);
    startIdx = 1;
  }

  const rawLabels = tokens.slice(startIdx);
  const seen = new Set<string>();
  const labels: string[] = [];
  for (const item of rawLabels) {
    const key = item.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      labels.push(item.slice(0, 64));
    }
  }

  if (labels.length < 2) {
    return { ok: false, error: "Provide at least 2 unique entrants (e.g. `/giveaway @alice @bob @charlie`)." };
  }
  if (labels.length > 500) {
    return { ok: false, error: "Maximum 500 named entrants in Telegram (use gl1tchbased.xyz/quantum-core/random for up to 5,000)." };
  }
  if (winners < 1 || winners >= labels.length || winners > 50) {
    return { ok: false, error: `Winners must be between 1 and ${Math.min(50, labels.length - 1)}.` };
  }

  return { ok: true, mode: "labels", winners, labels };
}

const dailyGiveawayUsage = new Map<string, number>();
const FREE_DAILY_GIVEAWAYS = 1;
const HOLDER_DAILY_GIVEAWAYS = 25;

export function checkGiveawayQuota(
  userId: number,
  isHolder: boolean,
  now = Date.now()
): { allowed: boolean; used: number; limit: number } {
  const day = new Date(now).toISOString().slice(0, 10);
  const key = `${day}:${userId}`;
  const used = dailyGiveawayUsage.get(key) ?? 0;
  const limit = isHolder ? HOLDER_DAILY_GIVEAWAYS : FREE_DAILY_GIVEAWAYS;
  if (used >= limit) return { allowed: false, used, limit };
  dailyGiveawayUsage.set(key, used + 1);
  return { allowed: true, used: used + 1, limit };
}

export function formatRevealMessage(rec: PublicRecord): string {
  const proofUrl = `${OFFICIAL.SITE}/quantum-core/random?id=${rec.id}`;
  const medal = (i: number) => (i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`);

  let winnersBlock = "";
  if (rec.mode === "allocation" && rec.winners && rec.winners.length > 0) {
    winnersBlock = rec.winners.map((w, i) => `${medal(i)} <b>${esc(w)}</b>`).join("\n");
  } else if (rec.result?.values?.length) {
    winnersBlock = rec.result.values
      .map((v, i) => `${medal(i)} <b>Ticket #${rec.spec.kind === "pick" ? v + 1 : v}</b>`)
      .join("\n");
  }

  return (
    `🎉 <b>QUANTUM GIVEAWAY — WINNER(S) REVEALED</b>\n\n` +
    `${winnersBlock}\n\n` +
    `• <b>drand Round:</b> <code>#${rec.targetRound}</code> (League of Entropy threshold-BLS)\n` +
    `• <b>BLS Seed:</b> <code>${esc((rec.proof?.randomness || "").slice(0, 24))}…</code>\n` +
    (rec.listRoot ? `• <b>Frozen List SHA-256:</b> <code>${rec.listRoot.slice(0, 20)}…</code>\n` : "") +
    `• <b>Commitment ID:</b> <code>${rec.id.slice(0, 20)}…</code>\n\n` +
    `🔬 <a href="${proofUrl}">Verify BLS signature &amp; re-derive in browser →</a>\n` +
    `<i>Provably fair · Committed before round #${rec.targetRound} existed · Zero trust in GL1TCH.</i>`
  );
}

const revealedIds = new Set<string>();

giveawayCommands.command("giveaway", async (ctx) => {
  const raw = (ctx.match || "").trim();
  if (!raw) {
    await ctx.reply(
      `🎲 <b>GL1TCH QUANTUM GIVEAWAY — PROVABLY FAIR</b>\n\n` +
        `Draw winners in Telegram with a cryptographic commitment to a <b>future</b> League-of-Entropy (drand) round. Nobody — not the host, not GL1TCH — can know or rig the winner at commit time.\n\n` +
        `<b>Examples:</b>\n` +
        `• Pick 1 winner from named users:\n  <code>/giveaway @alice @bob @charlie @dave</code>\n` +
        `• Pick 2 winners from named users:\n  <code>/giveaway 2 @alice @bob @charlie @dave</code>\n` +
        `• Pick 1 ticket from #1 to #100:\n  <code>/giveaway 100</code>\n\n` +
        `• <b>Free Tier:</b> 1 verifiable draw/day\n` +
        `• <b>$GL1TCH Holders (<code>/verify</code>):</b> 25 verifiable draws/day\n` +
        `• <b>AI Agents (x402):</b> <code>GET /api/x402/random</code> ($0.003 USDC)`,
      {
        ...HTML,
        reply_markup: new InlineKeyboard().url(
          "🔬 Web Giveaway Console ↗",
          `${OFFICIAL.SITE}/quantum-core/random`
        ),
      }
    );
    return;
  }

  const parsed = parseGiveawayArgs(raw);
  if (!parsed.ok) {
    await ctx.reply(`⚠️ ${esc(parsed.error)}`, HTML);
    return;
  }

  const uid = ctx.from?.id ?? 0;
  const v = uid ? verifyStore.getVerification(uid) : null;
  const isHolder = Boolean(v && v.balance > 0);
  const quota = checkGiveawayQuota(uid, isHolder);

  if (!quota.allowed) {
    await ctx.reply(
      `🎲 <b>Daily Free Giveaway Used (${quota.used}/${quota.limit})</b>\n\n` +
        `Verify any <b>$GL1TCH</b> holding via <code>/verify</code> in DM to unlock <b>${HOLDER_DAILY_GIVEAWAYS} provably-fair giveaways per day</b> for free, or call <code>GET /api/x402/random</code> ($0.003 USDC per draw).`,
      {
        ...HTML,
        reply_markup: new InlineKeyboard()
          .url("🛡 Verify $GL1TCH Holding ↗", `${OFFICIAL.SITE}/verify`)
          .url("🔬 Web Console ↗", `${OFFICIAL.SITE}/quantum-core/random`),
      }
    );
    return;
  }

  await ctx.replyWithChatAction("typing").catch(() => {});

  const tierNum = v ? (RANK_TIERS.find((t) => t.id === v.tierId)?.tier ?? 1) : 1;
  const reqArgs =
    parsed.mode === "labels"
      ? {
          apiKey: `tg:${uid}`,
          tier: tierNum,
          tierId: v?.tierId ?? "observer",
          labels: parsed.labels,
          winners: parsed.winners,
          salt: `tg-${ctx.chat?.id ?? uid}`,
        }
      : {
          apiKey: `tg:${uid}`,
          tier: tierNum,
          tierId: v?.tierId ?? "observer",
          spec: { kind: "ints", min: 1, max: parsed.totalTickets, count: parsed.winners },
          salt: `tg-${ctx.chat?.id ?? uid}`,
        };

  const res = await requestRandom(reqArgs);
  if (res.status !== 200 || !res.body.ok) {
    await ctx.reply(
      `⚠️ Could not commit giveaway right now (${esc(String(res.body.error || "drand unavailable"))}). Try again in a moment.`,
      HTML
    );
    return;
  }

  const rec = res.body as unknown as PublicRecord;
  const proofUrl = `${OFFICIAL.SITE}/quantum-core/random?id=${rec.id}`;
  const waitSec = Math.max(5, Math.ceil((rec.availableInMs || 60_000) / 1000));
  const poolDesc =
    parsed.mode === "labels"
      ? `<b>${parsed.winners}</b> winner(s) from <b>${parsed.labels.length}</b> entrants`
      : `<b>${parsed.winners}</b> winning ticket(s) from <b>#1..#${parsed.totalTickets}</b>`;

  const kb = new InlineKeyboard()
    .text("🎲 Check / Reveal Winner", `gw:reveal:${rec.id}`)
    .row()
    .url("🔬 Live Proof & Browser BLS Verify ↗", proofUrl);

  const sent = await ctx.reply(
    `🔒 <b>QUANTUM GIVEAWAY COMMITTED</b>\n\n` +
      `• <b>Draw:</b> ${poolDesc}\n` +
      `• <b>Future drand Round:</b> <code>#${rec.targetRound}</code> (finalizes in ~${waitSec}s)\n` +
      (rec.listRoot ? `• <b>Frozen Entrant SHA-256:</b> <code>${rec.listRoot.slice(0, 20)}…</code>\n` : "") +
      `• <b>Commitment ID:</b> <code>${rec.id.slice(0, 20)}…</code>\n\n` +
      `⏳ <i>Waiting ~${waitSec}s for round #${rec.targetRound} to finalize on League of Entropy… I will auto-post the winner here as soon as the round exists.</i>`,
    { ...HTML, reply_markup: kb }
  );

  // Schedule automatic reveal when the target drand round finalizes
  const chatId = ctx.chat.id;
  const replyToMsgId = sent.message_id;
  const delayMs = Math.min(90_000, Math.max(5_000, (rec.availableInMs || 60_000) + 2_500));
  setTimeout(async () => {
    if (revealedIds.has(rec.id)) return;
    try {
      const check = await getRandom(rec.id);
      const body = check.body as unknown as PublicRecord;
      if (body && body.status === "fulfilled") {
        revealedIds.add(rec.id);
        await ctx.api.sendMessage(chatId, formatRevealMessage(body), {
          ...HTML,
          reply_parameters: { message_id: replyToMsgId },
          reply_markup: new InlineKeyboard().url(
            "✅ Verify BLS Signature in Browser ↗",
            proofUrl
          ),
        });
      }
    } catch {
      /* User can still click Check / Reveal Winner button */
    }
  }, delayMs).unref?.();
});

giveawayCommands.callbackQuery(/^gw:reveal:([0-9a-f]{64})$/, async (ctx) => {
  const id = ctx.match[1];
  const check = await getRandom(id);
  const body = check.body as unknown as PublicRecord;
  if (!body || !body.ok) {
    await ctx.answerCallbackQuery({ text: "Proof not found.", show_alert: true });
    return;
  }
  if (body.status === "pending") {
    const left = Math.max(1, Math.ceil((body.availableInMs || 5000) / 1000));
    await ctx.answerCallbackQuery({
      text: `⏳ Round #${body.targetRound} finalizes in ~${left}s. Try again in ${left}s!`,
      show_alert: true,
    });
    return;
  }
  await ctx.answerCallbackQuery({ text: "🎉 Winner revealed!" });
  if (!revealedIds.has(id)) {
    revealedIds.add(id);
    const proofUrl = `${OFFICIAL.SITE}/quantum-core/random?id=${id}`;
    await ctx.reply(formatRevealMessage(body), {
      ...HTML,
      reply_markup: new InlineKeyboard().url(
        "✅ Verify BLS Signature in Browser ↗",
        proofUrl
      ),
    });
  }
});
