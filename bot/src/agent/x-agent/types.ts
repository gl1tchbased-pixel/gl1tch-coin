/** X Agent — shared types. */

export type Voice = "lore" | "proof" | "community" | "meme";
export type Category =
  | "evergreen"
  | "trust-flex"
  | "how-to-buy"
  | "anti-scam"
  | "reply-to-trend"
  | "build-update" // features shipped, what's new under the hood
  | "value-prop" // customer-facing "what is GL1TCH" for newcomers
  | "holder-journey" // tier aspiration, room-unlock storytelling
  // Data-driven drafts (compose.ts), built from what the product actually did:
  | "radar-catch" // one token the latest Rug Radar sweep flagged, with its top reason
  | "radar-digest" // the sweep in numbers + its most common red flag
  | "red-flag" // one risk explained (why it matters, how to check), tied to what the radar sees now
  | "feature" // one shipped feature, rotated
  | "usage" // people-run scan count, from the public counter
  | "token"; // $GL1TCH facts a reader can verify, kept rare

export interface Variant {
  id: string;
  voice: Voice;
  category: Category;
  text: string; // <=280
  imageAsset?: string; // file under assets/generated/
}

export interface Opportunity {
  id: string;
  source: "nitter" | "reddit" | "dexscreener";
  url: string;
  /** Author/handle/subreddit — shown to admin for context. */
  author: string;
  title: string;
  excerpt: string;
  score: number; // 0-100
  metrics: { engagement?: number; ageHours?: number; relevance?: number };
  /** For X opportunities, the tweet id (used by reply intent URL). */
  tweetId?: string;
  suggestedReply?: Variant;
}
