import { Composer, type Context } from "grammy";
import { getSection } from "./sections.js";

export const callbacks = new Composer<Context>();

const HTML = {
  parse_mode: "HTML" as const,
  link_preview_options: { is_disabled: true },
};

/** Edit the current message in place — single-message navigation (premium UX). */
async function navigate(ctx: Context, key: string, loreIndex = 0) {
  const s = getSection(key, loreIndex);
  try {
    await ctx.editMessageText(s.text, { ...HTML, reply_markup: s.kb });
  } catch {
    // If the message can't be edited (too old), send a fresh one.
    await ctx.reply(s.text, { ...HTML, reply_markup: s.kb });
  }
  await ctx.answerCallbackQuery();
}

// Menu navigation: m:home | m:rank | m:lore | m:faq | m:rules | m:links
callbacks.callbackQuery(/^m:(\w+)$/, async (ctx) => {
  await navigate(ctx, ctx.match[1]);
});

// Sequential lore: lore:<index>
callbacks.callbackQuery(/^lore:(\d+)$/, async (ctx) => {
  await navigate(ctx, "lore", Number(ctx.match[1]));
});
