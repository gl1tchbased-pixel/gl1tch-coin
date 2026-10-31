import { Composer, type Api, type Context } from "grammy";
import { config, isAdmin } from "../config.js";
import { officialGroups } from "../guardian/commands.js";
import { safeReadJson, safeWriteJson } from "../lib/safe-io.js";
import { looksLikeScam } from "../middleware.js";
import { extractAddress } from "../scan.js";
import { answer, greet, type Exchange } from "./answer.js";
import { Budget, CHAT_GAP_MS, QUESTION_GAP_MS } from "./budget.js";
import { CHAT_RULE, SKIP_RULE } from "./knowledge.js";
import { isLlmConfigured } from "./llm.js";
import { classify, type Trigger } from "./trigger.js";

/**
 * Takes part in our groups and answers questions in plain language, instead of pointing at menus. Runs after the
 * commands and the auto-scanner. Nothing is written to disk: what it remembers of a chat dies with the process.
 */
export const assistant = new Composer<Context>();

// Telegram posts anonymous group admins as this service account.
const ANONYMOUS_ADMIN = "GroupAnonymousBot";
const HISTORY_TURNS = 3;
const HISTORY_TTL_MS = 30 * 60_000;
const RECENT_MESSAGES = 12;
const RECENT_TTL_MS = 6 * 3_600_000;
const RECENT_CHARS = 200;
const ANNOUNCED_PATH = `${process.env.RAILWAY_VOLUME_MOUNT_PATH ?? "/tmp"}/gl1tch-assistant-announced.json`;

const DIRECT: ReadonlySet<Trigger> = new Set<Trigger>(["private", "mention", "reply"]);
const GAP_MS: Record<Trigger, number> = { private: 0, mention: 0, reply: 0, admin: 0, ambient: QUESTION_GAP_MS, chat: CHAT_GAP_MS };
const RULE: Partial<Record<Trigger, string>> = { ambient: SKIP_RULE, admin: SKIP_RULE, chat: CHAT_RULE };

/** The groups that are ours: the public one and the holder rooms. Elsewhere the bot is a guest. */
export function ownGroups(): string[] {
  return [...officialGroups(), ...Object.values(config.verify.gatedChats)];
}

const budget = new Budget();
const history = new Map<number, { at: number; turns: Exchange[] }>();
const recent = new Map<number, Array<{ at: number; line: string }>>();

function recall(chatId: number, now: number): Exchange[] {
  const h = history.get(chatId);
  return h && now - h.at <= HISTORY_TTL_MS ? h.turns : [];
}

function remember(chatId: number, turn: Exchange, now: number): void {
  const turns = [...recall(chatId, now), turn].slice(-HISTORY_TURNS);
  // Drop expired chats on the way in, so chats that went quiet don't linger in memory.
  for (const [id, h] of history) if (now - h.at > HISTORY_TTL_MS) history.delete(id);
  history.set(chatId, { at: now, turns });
}

function note(chatId: number, name: string, text: string, now: number): void {
  const kept = (recent.get(chatId) ?? []).filter((m) => now - m.at <= RECENT_TTL_MS);
  kept.push({ at: now, line: `${name.slice(0, 30)}: ${text.slice(0, RECENT_CHARS).replace(/\n/g, " ")}` });
  recent.set(chatId, kept.slice(-RECENT_MESSAGES));
}

const FAILURE_TEXT = "I can't answer right now, please try again shortly. /scan and /faq still work.";

assistant.on("message:text", async (ctx, next) => {
  if (!isLlmConfigured()) return next();
  const msg = ctx.message;
  const from = ctx.from;
  const me = ctx.me.username;
  const replied = msg.reply_to_message;
  // A channel post Telegram mirrors into its discussion group, or a forward, is not a person talking.
  if (msg.is_automatic_forward || msg.forward_origin || looksLikeScam(msg.text)) return next();

  const anonymousAdmin = from.username === ANONYMOUS_ADMIN;
  const admin = anonymousAdmin || isAdmin(from.id);
  const fromBot = from.is_bot && !anonymousAdmin;
  const own = ownGroups().includes(String(ctx.chat.id));
  const now = Date.now();
  const question = msg.text.replace(new RegExp(`@${me}`, "gi"), "").trim();
  const earlier = recent.get(ctx.chat.id)?.filter((m) => now - m.at <= RECENT_TTL_MS).map((m) => m.line) ?? [];
  // Commands never get here, so this is the conversation itself. Only our groups are kept.
  if (own && !fromBot && !msg.text.startsWith("/")) note(ctx.chat.id, anonymousAdmin ? "Admin" : from.first_name, question, now);

  const trigger = classify({
    text: msg.text,
    chatType: ctx.chat.type,
    officialGroup: own,
    fromAdmin: admin,
    fromBot,
    mentionsBot: msg.text.toLowerCase().includes(`@${me.toLowerCase()}`),
    repliesToBot: replied?.from?.id === ctx.me.id,
    repliesToOther: Boolean(replied) && replied?.from?.id !== ctx.me.id,
    hasAddress: extractAddress(msg.text) !== null,
  });
  if (!trigger || !question) return next();

  if (!budget.take({ chatId: ctx.chat.id, userId: from.id, exempt: admin, gapMs: GAP_MS[trigger], now })) {
    console.log(`[assistant] held back chat=${ctx.chat.id} trigger=${trigger}`);
    return next();
  }

  const direct = DIRECT.has(trigger);
  if (direct) await ctx.replyWithChatAction("typing").catch(() => {});
  const out = await answer({
    question,
    quoted: replied?.text ?? replied?.caption,
    history: own ? [] : recall(ctx.chat.id, now),
    recent: own ? earlier : [],
    rule: RULE[trigger],
  }).catch((e: unknown) => {
    console.error("[assistant] failed:", (e as Error).message);
    return null;
  });
  console.log(`[assistant] chat=${ctx.chat.id} trigger=${trigger} answered=${Boolean(out)} ms=${Date.now() - now}`);

  if (out) {
    if (own) note(ctx.chat.id, "You", out, Date.now());
    else remember(ctx.chat.id, { question, answer: out }, now);
    budget.spoke(ctx.chat.id);
    await ctx
      .reply(out, { reply_parameters: { message_id: msg.message_id }, link_preview_options: { is_disabled: true } })
      .catch((e: unknown) => console.error("[assistant] send failed:", (e as Error).message));
  } else if (direct) {
    // Silence is right when the bot wasn't asked. When it was, say so instead of ignoring the person.
    await ctx.reply(FAILURE_TEXT, { reply_parameters: { message_id: msg.message_id } }).catch(() => {});
  }
  return next();
});

/** A new member's welcome, by name. Null means use the fixed text. */
export async function welcomeFor(chatId: number, name: string): Promise<string | null> {
  if (!isLlmConfigured()) return null;
  const out = await greet(name.slice(0, 40)).catch(() => null);
  if (out) {
    budget.spoke(chatId);
    note(chatId, "You", out, Date.now());
  }
  return out;
}

const NOTICE =
  "Hi, I'm this group's AI bot. I now read the messages here and may join in, and you can ask me anything about token safety. " +
  "To reply, I send recent messages to our AI provider (Groq), so please don't post anything private. I can be wrong, and I never give buy or sell advice.";

/** People who were already here deserve to be told, once per group, that the bot now reads along. */
export async function announceOnce(api: Api): Promise<void> {
  if (!isLlmConfigured()) return;
  const done = new Set(safeReadJson<string[]>(ANNOUNCED_PATH, "assistant") ?? []);
  for (const chatId of new Set(ownGroups())) {
    if (done.has(chatId)) continue;
    try {
      await api.sendMessage(chatId, NOTICE);
      done.add(chatId);
      safeWriteJson(ANNOUNCED_PATH, [...done]);
    } catch (e) {
      console.error(`[assistant] notice failed chat=${chatId}:`, (e as Error).message);
    }
  }
}
