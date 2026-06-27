/** Approval Queue — formats variants/opportunities into Telegram messages
 *  with inline-button keyboards. The "Tweet via X" button is the only post path:
 *  it opens the X composer with text pre-filled. The user posts manually. */

import type { Api } from "grammy";
import type { InlineKeyboardMarkup } from "grammy/types";
import { config } from "../../config.js";
import { OFFICIAL } from "../../content.js";
import type { Opportunity, Variant } from "./types.js";
import { intentReply, intentTweet } from "./intent.js";

const HTML = { parse_mode: "HTML" as const, link_preview_options: { is_disabled: true } };
const IMAGE_HOST = OFFICIAL.SITE.replace(/\/$/, "") + "/pump";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Build the public CDN URL for a pump-pack image (hosted on the website). */
export function imageUrl(filename: string): string {
  return `${IMAGE_HOST}/${filename}`;
}

/** Render a single variant as a Telegram message + inline keyboard. */
export function renderVariantMessage(v: Variant): {
  text: string;
  reply_markup: InlineKeyboardMarkup;
} {
  const tag = `${v.voice.toUpperCase()} · ${v.category.toUpperCase()}`;
  const text =
    `<b>📱 X POST READY</b>\n` +
    `<i>${esc(tag)}</i>\n\n` +
    `<pre>${esc(v.text)}</pre>\n\n` +
    `<i>Tap “Tweet via X” → X opens with text ready → you tap Tweet.</i>`;

  const reply_markup: InlineKeyboardMarkup = {
    inline_keyboard: buildVariantKeyboard(v),
  };
  return { text, reply_markup };
}

/** Inline keyboard layout shared by text + photo variant DMs.
 *  Row 1: 🐦 Tweet via X
 *  Row 2: 📤 Post to TG group  (only when AGENT_CHANNEL_ID is configured)
 *  Row 3: ⏭ Next · ✅ Posted · ❌ Skip */
export function buildVariantKeyboard(v: Variant): InlineKeyboardMarkup["inline_keyboard"] {
  const rows: InlineKeyboardMarkup["inline_keyboard"] = [
    [{ text: "🐦 Tweet via X", url: intentTweet(v.text) }],
  ];
  if (config.agent.channelId) {
    rows.push([{ text: "📤 Post to TG group", callback_data: `xq:tgpost:${v.id}` }]);
  }
  if (config.xBridge.token) {
    // Queues the variant for the LOCAL Playwright worker to auto-post on X.
    rows.push([{ text: "🤖 Auto-post on X (local)", callback_data: `xq:autopost:${v.id}` }]);
  }
  rows.push([
    { text: "⏭ Next", callback_data: `xq:next:${v.id}` },
    { text: "✅ Posted", callback_data: `xq:done:${v.id}` },
    { text: "❌ Skip", callback_data: `xq:skip:${v.id}` },
  ]);
  return rows;
}

/** Render the caption for a variant SENT AS A PHOTO. Includes 3-step instruction. */
export function renderVariantPhotoCaption(v: Variant): string {
  const tag = `${v.voice.toUpperCase()} · ${v.category.toUpperCase()}`;
  return (
    `<b>📱 X POST READY</b> — <i>${esc(tag)}</i>\n\n` +
    `<pre>${esc(v.text)}</pre>\n\n` +
    `① Long-press image → <b>Save</b>\n` +
    `② Tap <b>🐦 Tweet via X</b> below → composer opens, text ready\n` +
    `③ In X, tap 🖼 → pick saved image → <b>Tweet</b>`
  );
}

/** Render an opportunity (external post we could engage with). */
export function renderOpportunityMessage(o: Opportunity, reply: Variant): {
  text: string;
  reply_markup: InlineKeyboardMarkup;
} {
  const tag = `${o.source.toUpperCase()} · score ${o.score}`;
  const meta =
    `${o.author} · age ${Math.round(o.metrics.ageHours ?? 0)}h` +
    (o.metrics.engagement ? ` · eng ${o.metrics.engagement}` : "");
  const text =
    `<b>🎯 REPLY OPPORTUNITY</b>\n` +
    `<i>${esc(tag)}</i>\n\n` +
    `<b>${esc(o.title)}</b>\n` +
    `<i>${esc(meta)}</i>\n\n` +
    `<blockquote>${esc(o.excerpt.slice(0, 300))}${o.excerpt.length > 300 ? "…" : ""}</blockquote>\n\n` +
    `<b>Suggested reply:</b>\n<pre>${esc(reply.text)}</pre>`;

  const replyUrl = o.tweetId ? intentReply(o.tweetId, reply.text) : null;
  const tweetAboutUrl = intentTweet(reply.text);
  const row1: { text: string; url: string }[] = [{ text: "🔗 View source", url: o.url }];
  if (replyUrl) row1.unshift({ text: "🐦 Reply via X", url: replyUrl });
  else row1.unshift({ text: "🐦 Tweet about this", url: tweetAboutUrl });

  const reply_markup: InlineKeyboardMarkup = {
    inline_keyboard: [
      row1,
      [
        { text: "⏭ Next opp", callback_data: `xq:nextopp:${o.id}` },
        { text: "✅ Replied", callback_data: `xq:doneopp:${o.id}` },
        { text: "❌ Skip", callback_data: `xq:skipopp:${o.id}` },
      ],
    ],
  };
  return { text, reply_markup };
}

/** DM the admin a variant. When the variant carries an imageAsset, sends as a
 *  photo with caption — admin can long-press to save the image, then tap Tweet
 *  via X to launch the composer with text pre-filled. (X intent URLs do NOT
 *  carry images; this 3-step flow is the floor without paid X API.) */
export async function dmAdminVariant(api: Api, adminId: number, v: Variant): Promise<void> {
  if (v.imageAsset) {
    const caption = renderVariantPhotoCaption(v);
    const reply_markup: InlineKeyboardMarkup = {
      inline_keyboard: buildVariantKeyboard(v),
    };
    try {
      await api.sendPhoto(adminId, imageUrl(v.imageAsset), {
        caption,
        parse_mode: "HTML",
        reply_markup,
      });
      return;
    } catch (err) {
      console.warn("[x-agent] sendPhoto failed, falling back to text:", (err as Error).message);
      /* fall through to text-only path */
    }
  }
  const m = renderVariantMessage(v);
  try {
    await api.sendMessage(adminId, m.text, { ...HTML, reply_markup: m.reply_markup });
  } catch {
    /* admin hasn't started bot — skip */
  }
}

export async function dmAdminOpportunity(
  api: Api,
  adminId: number,
  o: Opportunity,
  reply: Variant,
): Promise<void> {
  const m = renderOpportunityMessage(o, reply);
  try {
    await api.sendMessage(adminId, m.text, { ...HTML, reply_markup: m.reply_markup });
  } catch {
    /* skip */
  }
}
