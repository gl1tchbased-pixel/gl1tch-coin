/** Callback handlers for X agent inline buttons (xq:* actions). */

import { Composer, type Context } from "grammy";
import { config, isAdmin } from "../../config.js";
import { postToChannel, postPhotoToChannel } from "../telegram.js";
import { buildVariant, buildReply, parseVariantId } from "./content.js";
import { renderVariantMessage, imageUrl } from "./queue.js";
import { recordPost, recordRating, type Rating } from "./perf.js";
import { enqueueX, pendingCountX } from "./xqueue.js";

function rebuildVariant(variantId: string) {
  const parsed = parseVariantId(variantId);
  if (!parsed) return null;
  return buildVariant(parsed.voice, parsed.category, parsed.seed);
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function tgCaption(v: ReturnType<typeof buildVariant>): string {
  if (!v) return "";
  return `<b>$GL1TCH</b>\n\n${esc(v.text).replace(/\$GL1TCH/g, "<b>$GL1TCH</b>")}`;
}

export const xCallbacks = new Composer<Context>();

const HTML = { parse_mode: "HTML" as const, link_preview_options: { is_disabled: true } };

xCallbacks.callbackQuery(/^xq:(next|done|skip):(.+)$/, async (ctx) => {
  if (!isAdmin(ctx.from?.id)) {
    await ctx.answerCallbackQuery({ text: "Admin only." });
    return;
  }
  const [, action, variantId] = ctx.match;

  if (action === "done") {
    // Log into the performance store + auto-cross-post to TG group.
    const v = rebuildVariant(variantId);
    let tgStatus: "ok" | "off" | "fail" = "off";
    if (v) {
      recordPost({ variantId: v.id, voice: v.voice, category: v.category, text: v.text });
      // Cross-post to TG group (so X + TG fire from a single tap).
      if (config.agent.channelId) {
        try {
          if (v.imageAsset) {
            await postPhotoToChannel(ctx.api, imageUrl(v.imageAsset), tgCaption(v));
          } else {
            await postToChannel(ctx.api, tgCaption(v));
          }
          tgStatus = "ok";
        } catch (err) {
          console.warn("[x-agent] auto TG cross-post failed:", (err as Error).message);
          tgStatus = "fail";
        }
      }
    }
    const badge =
      tgStatus === "ok"
        ? "✅ POSTED — X (manual) + TG ✓ — rating in 24h"
        : tgStatus === "fail"
          ? "✅ POSTED on X — TG cross-post failed (check bot admin in group)"
          : "✅ POSTED — rating in 24h";
    try {
      await ctx.editMessageReplyMarkup({
        reply_markup: {
          inline_keyboard: [[{ text: badge, callback_data: "xq:noop" }]],
        },
      });
    } catch {
      /* message too old to edit — fall through */
    }
    await ctx.answerCallbackQuery({
      text:
        tgStatus === "ok"
          ? "Logged + cross-posted to TG."
          : tgStatus === "fail"
            ? "Logged. TG cross-post failed."
            : "Logged.",
    });
    return;
  }
  if (action === "skip") {
    try {
      await ctx.editMessageReplyMarkup({
        reply_markup: { inline_keyboard: [[{ text: "❌ SKIPPED", callback_data: "xq:noop" }]] },
      });
    } catch {
      /* ignore */
    }
    await ctx.answerCallbackQuery({ text: "Skipped." });
    return;
  }
  // action === "next" — generate a new variant in same voice+category, next seed
  const parsed = parseVariantId(variantId);
  if (!parsed) {
    await ctx.answerCallbackQuery({ text: "Variant ID malformed." });
    return;
  }
  const next = buildVariant(parsed.voice, parsed.category, parsed.seed + 7);
  if (!next) {
    await ctx.answerCallbackQuery({ text: "No more variants." });
    return;
  }
  const m = renderVariantMessage(next);
  await ctx.editMessageText(m.text, { ...HTML, reply_markup: m.reply_markup });
  await ctx.answerCallbackQuery({ text: "Next variant." });
});

xCallbacks.callbackQuery(/^xq:(nextopp|doneopp|skipopp):(.+)$/, async (ctx) => {
  if (!isAdmin(ctx.from?.id)) {
    await ctx.answerCallbackQuery({ text: "Admin only." });
    return;
  }
  const action = ctx.match[1];
  if (action === "doneopp") {
    try {
      await ctx.editMessageReplyMarkup({
        reply_markup: { inline_keyboard: [[{ text: "✅ ACTIONED — signal carried", callback_data: "xq:noop" }]] },
      });
    } catch { /* ignore */ }
    await ctx.answerCallbackQuery({ text: "Logged." });
    return;
  }
  if (action === "skipopp") {
    try {
      await ctx.editMessageReplyMarkup({
        reply_markup: { inline_keyboard: [[{ text: "❌ SKIPPED", callback_data: "xq:noop" }]] },
      });
    } catch { /* ignore */ }
    await ctx.answerCallbackQuery({ text: "Skipped." });
    return;
  }
  // nextopp — rotate an alt reply suggestion
  const r = buildReply(Math.floor(Date.now() / 1000) % 4 + 1);
  await ctx.answerCallbackQuery({ text: "Alt take sent." });
  await ctx.reply(`<b>Alt suggested take:</b>\n<pre>${r.text.replace(/</g, "&lt;")}</pre>`, HTML);
});

// 📤 Post to TG group — bot posts the variant directly to the configured channel.
xCallbacks.callbackQuery(/^xq:tgpost:(.+)$/, async (ctx) => {
  if (!isAdmin(ctx.from?.id)) {
    await ctx.answerCallbackQuery({ text: "Admin only." });
    return;
  }
  const variantId = ctx.match[1];
  const v = rebuildVariant(variantId);
  if (!v) {
    await ctx.answerCallbackQuery({ text: "Variant lookup failed (old format — request a fresh batch via /xcontent)." });
    return;
  }
  try {
    if (v.imageAsset) {
      await postPhotoToChannel(ctx.api, imageUrl(v.imageAsset), tgCaption(v));
    } else {
      await postToChannel(ctx.api, tgCaption(v));
    }
    try {
      await ctx.editMessageReplyMarkup({
        reply_markup: { inline_keyboard: [[{ text: "📤 POSTED TO TG", callback_data: "xq:noop" }]] },
      });
    } catch { /* ignore */ }
    await ctx.answerCallbackQuery({ text: "Posted to TG group ✓" });
  } catch (err) {
    await ctx.answerCallbackQuery({ text: "TG post failed — check AGENT_CHANNEL_ID + bot admin rights." });
    console.warn("[x-agent] TG post failed:", (err as Error).message);
  }
});

// 🤖 Auto-post on X (local) — queue the variant for the local Playwright worker.
// The worker (on the founder's PC, logged-in browser) polls /xqueue and posts it.
xCallbacks.callbackQuery(/^xq:autopost:(.+)$/, async (ctx) => {
  if (!isAdmin(ctx.from?.id)) {
    await ctx.answerCallbackQuery({ text: "Admin only." });
    return;
  }
  if (!config.xBridge.token) {
    await ctx.answerCallbackQuery({ text: "Bridge disabled (X_BRIDGE_TOKEN unset)." });
    return;
  }
  const v = rebuildVariant(ctx.match[1]);
  if (!v) {
    await ctx.answerCallbackQuery({ text: "Variant lookup failed (old format — request a fresh batch via /xcontent)." });
    return;
  }
  const item = enqueueX({
    kind: "post",
    text: v.text,
    imageUrl: v.imageAsset ? imageUrl(v.imageAsset) : null,
  });
  try {
    await ctx.editMessageReplyMarkup({
      reply_markup: {
        inline_keyboard: [[{ text: `🤖 QUEUED for auto-post (#${item.id})`, callback_data: "xq:noop" }]],
      },
    });
  } catch { /* message too old to edit */ }
  await ctx.answerCallbackQuery({ text: `Queued ✓ (${pendingCountX()} bekliyor). Yerel worker atacak.` });
});

// 📊 Performance rating — admin picks 🔥 hot / 👍 ok / 🥱 weak after 24h.
xCallbacks.callbackQuery(/^xq:rate:(hot|ok|weak):(.+)$/, async (ctx) => {
  if (!isAdmin(ctx.from?.id)) {
    await ctx.answerCallbackQuery({ text: "Admin only." });
    return;
  }
  const rating = ctx.match[1] as Rating;
  const variantId = ctx.match[2];
  recordRating(variantId, rating);
  const label = rating === "hot" ? "🔥 HOT" : rating === "ok" ? "👍 OK" : "🥱 WEAK";
  try {
    await ctx.editMessageReplyMarkup({
      reply_markup: { inline_keyboard: [[{ text: `${label} — weight updated`, callback_data: "xq:noop" }]] },
    });
  } catch { /* ignore */ }
  await ctx.answerCallbackQuery({ text: "Weight updated. Next batch favors top categories." });
});

// Silent no-op for the locked POSTED / SKIPPED badge button.
xCallbacks.callbackQuery(/^xq:noop$/, async (ctx) => {
  await ctx.answerCallbackQuery();
});
