/** Variant generator — composes (voice × category) into ready tweet text. */

import type { Category, Variant, Voice } from "./types.js";
import { availableCombos, clamp, pickTemplate } from "./voices.js";
import { weightOf } from "./perf.js";

/** Multi-image rotation per category — each generation cycles through the
 *  list using the seed so the same category doesn't always get the same visual. */
const IMAGES_BY_CATEGORY: Record<Category, string[]> = {
  evergreen: ["08-cult-emblem.jpg", "01-x-banner.jpg"],
  "trust-flex": ["02-zero-tax.jpg", "03-mint-null.jpg", "04-freeze-null.jpg"],
  "how-to-buy": ["06-how-to-buy.jpg"],
  "anti-scam": ["03-mint-null.jpg", "04-freeze-null.jpg"],
  "reply-to-trend": [],
  "build-update": ["05-rugcheck-1.jpg", "02-zero-tax.jpg", "08-cult-emblem.jpg"],
  "value-prop": ["01-x-banner.jpg", "05-rugcheck-1.jpg", "07-meme-template.jpg"],
  "holder-journey": ["08-cult-emblem.jpg", "07-meme-template.jpg"],
};

function pickImage(category: Category, seed: number): string | undefined {
  const list = IMAGES_BY_CATEGORY[category];
  if (!list || list.length === 0) return undefined;
  return list[Math.abs(seed) % list.length];
}

/** Anti-repetition: ring buffer of recently-served variant IDs.
 *  Restart-tolerant (set resets on bot restart, which is fine — restarts are rare). */
const RECENT_SIZE = 20;
const recentIds: string[] = [];
function markUsed(id: string): void {
  recentIds.push(id);
  while (recentIds.length > RECENT_SIZE) recentIds.shift();
}
function wasRecent(id: string): boolean {
  return recentIds.includes(id);
}

/** Variant ID format: `voice.category.seed36` — uses `.` because some
 *  categories contain `-` (e.g. "trust-flex"), which would corrupt parsing.
 *  Telegram callback_data is 1–64 bytes; "." is safe. */
function variantId(voice: Voice, category: Category, seed: number): string {
  return `${voice}.${category}.${seed.toString(36)}`;
}

/** Parse a variant ID back into its parts. Returns null on malformed input. */
export function parseVariantId(id: string): {
  voice: Voice;
  category: Category;
  seed: number;
} | null {
  const parts = id.split(".");
  if (parts.length !== 3) return null;
  const seed = parseInt(parts[2], 36);
  if (!Number.isFinite(seed)) return null;
  return {
    voice: parts[0] as Voice,
    category: parts[1] as Category,
    seed,
  };
}

/** Build a single variant given (voice, category, seed). Null if template missing. */
export function buildVariant(
  voice: Voice,
  category: Category,
  seed: number,
): Variant | null {
  const tpl = pickTemplate(voice, category, seed);
  if (!tpl) return null;
  return {
    id: variantId(voice, category, seed),
    voice,
    category,
    text: clamp(tpl()),
    imageAsset: pickImage(category, seed),
  };
}

/**
 * Generate `count` diverse variants across the configured mix.
 *
 * Mix (matches Cadence Manager rules):
 *   60% educational (proof + community + lore evergreen/trust-flex)
 *   30% community engagement (community/meme reply-to-trend, anti-scam)
 *   10% direct promotion (how-to-buy, hard-shill)
 */
export function generateBatch(seed: number, count = 6): Variant[] {
  const combos = availableCombos();
  // Deterministic shuffle by seed, biased by learned category weight.
  // weight=1.0 by default; rated posts shift it up (🔥) or down (🥱).
  const ordered = combos
    .map((c, i) => {
      const w = weightOf(c.category);
      const shuffleKey = ((seed + i * 17) ^ (i * 31)) >>> 0;
      // Lower sort key = picked earlier; divide by weight so high-weight combos sort first.
      return { c, k: shuffleKey / Math.max(0.1, w) };
    })
    .sort((a, b) => a.k - b.k)
    .map((x) => x.c);

  const picked: Variant[] = [];
  const seen = new Set<string>();
  // First pass: skip recently-used variant IDs entirely (no repeats inside RECENT_SIZE window).
  for (const combo of ordered) {
    if (picked.length >= count) break;
    for (let off = 0; off < 6; off++) {
      const v = buildVariant(combo.voice, combo.category, seed + off * 13);
      if (!v) break;
      if (seen.has(v.text)) continue;
      if (wasRecent(v.id)) continue;
      picked.push(v);
      seen.add(v.text);
      markUsed(v.id);
      break;
    }
  }
  // Fallback pass: if we couldn't fill `count` due to recent-set saturation, allow repeats.
  if (picked.length < count) {
    for (const combo of ordered) {
      if (picked.length >= count) break;
      for (let off = 0; off < 6; off++) {
        const v = buildVariant(combo.voice, combo.category, seed + off * 7);
        if (!v) break;
        if (seen.has(v.text)) continue;
        picked.push(v);
        seen.add(v.text);
        break;
      }
    }
  }
  return picked;
}

/** A short, single-line reply suggestion targeted at a specific external post. */
export function buildReply(seed: number): Variant {
  const lines = [
    `On-chain transparency is the only proof. $GL1TCH: mint+freeze null, RugCheck 1/Low, 0% tax. coin-three-mu.vercel.app`,
    `Solana memes that ship the audit: $GL1TCH. RugCheck score 1, Token-2022 zero tax, public give-back wallet. DYOR.`,
    `If you want the proof first, not the promise: $GL1TCH. rugcheck.xyz/tokens/3HQJwwHvzy8pGkPqGQcb4thZCH88MUCHVVSNtHn6pump`,
    `One utility, shipped on day one: hold → verify → climb the ranks. $GL1TCH on Solana.`,
  ];
  const text = clamp(lines[seed % lines.length]);
  return {
    id: `reply-${seed.toString(36)}`,
    voice: "proof",
    category: "reply-to-trend",
    text,
  };
}
