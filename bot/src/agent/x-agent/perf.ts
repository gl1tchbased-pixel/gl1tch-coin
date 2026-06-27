/** Performance Loop — tracks which posts got real engagement and adjusts the
 *  category weights for future generation. After admin taps ✅ Posted, the
 *  variant is logged. ~24h later, the bot DMs "📊 How did it do?" with
 *  3 rating buttons (🔥 hot / 👍 ok / 🥱 weak). The score nudges the
 *  category weight up/down, which biases the next generation cycle.
 *
 *  Persistence: best-effort JSON file at /tmp/gl1tch-perf.json. Survives
 *  in-container restarts; resets on Railway redeploy (free tier has no
 *  persistent volume). Acceptable — weights recalibrate within ~24h of new posts. */

import fs from "node:fs";
import path from "node:path";
import type { Category, Voice } from "./types.js";

const STORE_PATH = process.env.PERF_FILE ?? "/tmp/gl1tch-perf.json";
const RATE_DUE_MS = 24 * 60 * 60 * 1000; // ask for rating 24h after post
const RATE_STALE_MS = 7 * 24 * 60 * 60 * 1000; // stop asking after 7 days

export type Rating = "hot" | "ok" | "weak";

interface PostRecord {
  variantId: string;
  voice: Voice;
  category: Category;
  text: string;
  postedAt: number;
  ratedAt?: number;
  rating?: Rating;
}

interface PerfStore {
  posts: Record<string, PostRecord>;
  weights: Record<string, number>; // category -> weight (default 1.0)
}

const DEFAULT: PerfStore = { posts: {}, weights: {} };

let store: PerfStore = { ...DEFAULT };

function load(): void {
  try {
    if (fs.existsSync(STORE_PATH)) {
      const raw = fs.readFileSync(STORE_PATH, "utf-8");
      const parsed = JSON.parse(raw) as PerfStore;
      store = {
        posts: parsed.posts ?? {},
        weights: parsed.weights ?? {},
      };
    }
  } catch (err) {
    console.warn("[perf] load failed:", (err as Error).message);
    store = { ...DEFAULT };
  }
}

function save(): void {
  try {
    fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
    fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2));
  } catch (err) {
    console.warn("[perf] save failed:", (err as Error).message);
  }
}

load();

/** Record that a variant was posted to X (called when admin taps ✅ Posted). */
export function recordPost(opts: {
  variantId: string;
  voice: Voice;
  category: Category;
  text: string;
}): void {
  store.posts[opts.variantId] = {
    variantId: opts.variantId,
    voice: opts.voice,
    category: opts.category,
    text: opts.text,
    postedAt: Date.now(),
  };
  save();
}

/** Record the admin's rating of a posted variant. Updates the category weight. */
export function recordRating(variantId: string, rating: Rating): void {
  const post = store.posts[variantId];
  if (!post) return;
  post.rating = rating;
  post.ratedAt = Date.now();
  // Adjust category weight: 🔥 +0.5, 👍 +0.1, 🥱 -0.3. Clamp 0.1 .. 3.0.
  const delta = rating === "hot" ? 0.5 : rating === "ok" ? 0.1 : -0.3;
  const cur = store.weights[post.category] ?? 1.0;
  store.weights[post.category] = Math.max(0.1, Math.min(3.0, cur + delta));
  save();
}

/** Return current category weights (defaults to 1.0 for unseen categories). */
export function getCategoryWeights(): Record<string, number> {
  return { ...store.weights };
}

/** Convenience: weight for a single category, default 1.0. */
export function weightOf(category: Category): number {
  return store.weights[category] ?? 1.0;
}

/** Posts that were sent ~24h+ ago and haven't been rated yet (and aren't stale).
 *  Returned newest-first; cap N to avoid DM spam in one sweep. */
export function dueForRating(maxN = 3): PostRecord[] {
  const now = Date.now();
  const out: PostRecord[] = [];
  for (const p of Object.values(store.posts)) {
    if (p.rating) continue;
    const age = now - p.postedAt;
    if (age < RATE_DUE_MS) continue;
    if (age > RATE_STALE_MS) continue;
    out.push(p);
  }
  out.sort((a, b) => b.postedAt - a.postedAt);
  return out.slice(0, maxN);
}

/** Aggregate stats per category for admin reporting. */
export function summary(): Array<{ category: string; weight: number; hot: number; ok: number; weak: number; pending: number }> {
  const map = new Map<string, { weight: number; hot: number; ok: number; weak: number; pending: number }>();
  const ensure = (c: string) => {
    let v = map.get(c);
    if (!v) {
      v = { weight: store.weights[c] ?? 1.0, hot: 0, ok: 0, weak: 0, pending: 0 };
      map.set(c, v);
    }
    return v;
  };
  for (const p of Object.values(store.posts)) {
    const v = ensure(p.category);
    if (!p.rating) v.pending++;
    else v[p.rating]++;
  }
  return [...map.entries()].map(([category, v]) => ({ category, ...v }));
}
