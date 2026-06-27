import type { InlineKeyboard } from "grammy";
import {
  messages,
  rankText,
  faqText,
  loreText,
  linksText,
} from "./content.js";
import { menuKb, backKb, rankKb, loreKb, linksKb } from "./keyboards.js";

export interface Section {
  text: string;
  kb: InlineKeyboard;
}

/** Single source for both slash commands and callback navigation. */
export function getSection(key: string, loreIndex = 0): Section {
  switch (key) {
    case "rank":
      return { text: rankText(), kb: rankKb() };
    case "lore":
      return { text: loreText(loreIndex), kb: loreKb(loreIndex) };
    case "faq":
      return { text: faqText(), kb: backKb() };
    case "rules":
      return { text: messages.rules, kb: backKb() };
    case "links":
      return { text: linksText(), kb: linksKb() };
    case "home":
    default:
      return { text: messages.menu, kb: menuKb() };
  }
}
