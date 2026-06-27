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
  | "holder-journey"; // tier aspiration, room-unlock storytelling

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
