/** Rating-prompt builders. Called by the X agent during every sweep to ask
 *  the admin how their posts did 24h ago. Three-button feedback feeds the
 *  performance loop (perf.ts) → category weights → next generation. */

import type { Api } from "grammy";
import type { InlineKeyboardMarkup } from "grammy/types";
import { config } from "../../config.js";
import { dueForRating } from "./perf.js";

const HTML = { parse_mode: "HTML" as const, link_preview_options: { is_disabled: true } };

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** DM admin(s) any pending rating prompts. Called at the top of every sweep. */
export async function dmPendingRatings(api: Api, max = 2): Promise<number> {
  const due = dueForRating(max);
  if (due.length === 0) return 0;
  for (const adminId of config.adminIds) {
    for (const p of due) {
      const text =
        `<b>📊 PERFORMANCE CHECK</b>\n` +
        `<i>${esc(p.voice.toUpperCase())} · ${esc(p.category.toUpperCase())} · posted ~${Math.round((Date.now() - p.postedAt) / 36e5)}h ago</i>\n\n` +
        `<pre>${esc(p.text)}</pre>\n\n` +
        `<i>How did it do on X? Pick one — it tunes the next batch.</i>`;
      const reply_markup: InlineKeyboardMarkup = {
        inline_keyboard: [
          [
            { text: "🔥 Hot (>50 likes)", callback_data: `xq:rate:hot:${p.variantId}` },
            { text: "👍 OK (10-50)", callback_data: `xq:rate:ok:${p.variantId}` },
            { text: "🥱 Weak (<10)", callback_data: `xq:rate:weak:${p.variantId}` },
          ],
        ],
      };
      try {
        await api.sendMessage(adminId, text, { ...HTML, reply_markup });
      } catch {
        /* admin hasn't /started — skip */
      }
    }
  }
  return due.length;
}
