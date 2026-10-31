import { Composer, type Context } from "grammy";
import { isAdmin } from "../config.js";
import { officialGroups } from "../guardian/commands.js";
import { looksLikeScam } from "../middleware.js";
import { extractAddress } from "../scan.js";
import { answer, type Exchange } from "./answer.js";
import { Budget } from "./budget.js";
import { isLlmConfigured } from "./llm.js";
import { classify, maySkip, type Trigger } from "./trigger.js";

/**
 * Answers questions in plain language instead of pointing at menus. Runs after the commands and the auto-scanner.
 * Nothing is written to disk: the short history below only lets people ask a follow-up, and it dies with the process.
 */
export const assistant = new Composer<Context>();

// Telegram posts anonymous group admins as this service account.
const ANONYMOUS_ADMIN = "GroupAnonymousBot";
const HISTORY_TURNS = 3;
const HISTORY_TTL_MS = 30 * 60_000;
const DIRECT: ReadonlySet<Trigger> = new Set<Trigger>(["private", "mention", "reply"]);

const budget = new Budget();
const history = new Map<number, { at: number; turns: Exchange[] }>();

function recall(chatId: number, now: number): Exchange[] {
  const h = history.get(chatId);
  return h && now - h.at <= HISTORY_TTL_MS ? h.turns : [];
}

function remember(chatId: number, turn: Exchange, now: number): void {
  const turns = [...recall(chatId, now), turn].slice(-HISTORY_TURNS);
  // Drop expired chats on the way in, so groups that went quiet don't linger in memory.
  for (const [id, h] of history) if (now - h.at > HISTORY_TTL_MS) history.delete(id);
  history.set(chatId, { at: now, turns });
}

const failureText = (text: string): string =>
  /[çğıöşüÇĞİÖŞÜ]|\b(ne|mi|bu|bir|var|yok)\b/i.test(text)
    ? "Şu an cevap üretemiyorum, biraz sonra tekrar dener misin? Bu arada /scan ve /faq çalışıyor."
    : "I can't answer right now, please try again shortly. /scan and /faq still work.";

assistant.on("message:text", async (ctx, next) => {
  if (!isLlmConfigured()) return next();
  const msg = ctx.message;
  const from = ctx.from;
  const me = ctx.me.username;
  const replied = msg.reply_to_message;
  // A channel post Telegram mirrors into its discussion group, or a forward, is not a person asking something.
  if (msg.is_automatic_forward || msg.forward_origin || looksLikeScam(msg.text)) return next();

  const anonymousAdmin = from.username === ANONYMOUS_ADMIN;
  const admin = anonymousAdmin || isAdmin(from.id);
  const trigger = classify({
    text: msg.text,
    chatType: ctx.chat.type,
    officialGroup: officialGroups().includes(String(ctx.chat.id)),
    fromAdmin: admin,
    fromBot: from.is_bot && !anonymousAdmin,
    mentionsBot: msg.text.toLowerCase().includes(`@${me.toLowerCase()}`),
    repliesToBot: replied?.from?.id === ctx.me.id,
    repliesToOther: Boolean(replied) && replied?.from?.id !== ctx.me.id,
    hasAddress: extractAddress(msg.text) !== null,
  });
  if (!trigger) return next();

  const question = msg.text.replace(new RegExp(`@${me}`, "gi"), "").trim();
  if (!question) return next();

  const now = Date.now();
  if (!budget.take({ chatId: ctx.chat.id, userId: from.id, exempt: admin, ambient: trigger === "ambient", now })) {
    console.log(`[assistant] over budget chat=${ctx.chat.id} trigger=${trigger}`);
    return next();
  }

  const direct = DIRECT.has(trigger);
  if (direct) await ctx.replyWithChatAction("typing").catch(() => {});
  const out = await answer({
    question,
    quoted: replied?.text ?? replied?.caption,
    history: recall(ctx.chat.id, now),
    maySkip: maySkip(trigger),
  }).catch((e: unknown) => {
    console.error("[assistant] failed:", (e as Error).message);
    return null;
  });
  console.log(`[assistant] chat=${ctx.chat.id} trigger=${trigger} answered=${Boolean(out)} ms=${Date.now() - now}`);

  if (out) {
    remember(ctx.chat.id, { question, answer: out }, now);
    await ctx
      .reply(out, { reply_parameters: { message_id: msg.message_id }, link_preview_options: { is_disabled: true } })
      .catch((e: unknown) => console.error("[assistant] send failed:", (e as Error).message));
  } else if (direct) {
    // Silence is right when the bot wasn't asked. When it was, say so instead of ignoring the person.
    await ctx.reply(failureText(question), { reply_parameters: { message_id: msg.message_id } }).catch(() => {});
  }
  return next();
});
