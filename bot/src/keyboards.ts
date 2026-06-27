import { InlineKeyboard } from "grammy";
import { OFFICIAL, loreFragments } from "./content.js";

export const menuKb = () =>
  new InlineKeyboard()
    .text("◆ Ranks", "m:rank")
    .text("◆ Lore", "m:lore")
    .row()
    .text("◆ FAQ", "m:faq")
    .text("◆ Rules", "m:rules")
    .row()
    .text("◆ Official Links", "m:links");

export const backKb = () =>
  new InlineKeyboard().text("‹ Back to menu", "m:home");

export const rankKb = () => {
  const kb = new InlineKeyboard();
  kb.url("Verify Rank ↗", `${OFFICIAL.SITE}/ranks`).row();
  kb.text("‹ Back to menu", "m:home");
  return kb;
};

export const loreKb = (current: number) => {
  const n = loreFragments.length;
  const idx = ((current % n) + n) % n;
  const next = (idx + 1) % n;
  const kb = new InlineKeyboard();
  if (loreFragments[idx]?.locked) {
    kb.url("🔓 Decrypt — Verify Rank ↗", `${OFFICIAL.SITE}/ranks`).row();
  }
  kb.text("Next fragment →", `lore:${next}`)
    .row()
    .text("‹ Back to menu", "m:home");
  return kb;
};

export const linksKb = () =>
  new InlineKeyboard()
    .url("𝕏  Twitter", OFFICIAL.X)
    .url("Telegram", OFFICIAL.TG)
    .row()
    .url("Instagram", OFFICIAL.IG)
    .url("Reddit", OFFICIAL.REDDIT)
    .row()
    .url("Website", OFFICIAL.SITE)
    .row()
    .text("‹ Back to menu", "m:home");

export const startKb = () =>
  new InlineKeyboard()
    .text("Enter Control ◆", "m:home")
    .row()
    .url("Open Website ↗", OFFICIAL.SITE);
