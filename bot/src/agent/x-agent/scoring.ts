/** Opportunity scoring — single function so it's easy to tune & test. */

import type { Opportunity } from "./types.js";

/** Keywords that signal a likely Solana-meme buyer or relevant conversation. */
const HIGH_SIGNAL = [
  "solana",
  "memecoin",
  "meme coin",
  "pump.fun",
  "pumpfun",
  "rugcheck",
  "100x",
  "next gem",
  "bullish",
  "low cap",
  "stealth launch",
  "fair launch",
];
const NEG_SIGNAL = [
  "scam",
  "rug",
  "honeypot",
  "ico",
  "presale",
  "private sale",
  "airdrop claim",
];

/** Returns 0..100; below ~55 = skip, above ~75 = high-priority. */
export function scoreOpportunity(
  raw: Omit<Opportunity, "score">,
): number {
  let score = 50;
  const lower = (raw.title + " " + raw.excerpt).toLowerCase();

  // Keyword match — up to +25
  let kw = 0;
  for (const w of HIGH_SIGNAL) if (lower.includes(w)) kw += 6;
  score += Math.min(25, kw);

  // Negative signals — strong penalties
  let neg = 0;
  for (const w of NEG_SIGNAL) if (lower.includes(w)) neg += 8;
  score -= Math.min(40, neg);

  // Recency — newer is better (up to +20)
  const age = raw.metrics.ageHours ?? 24;
  if (age <= 1) score += 20;
  else if (age <= 6) score += 14;
  else if (age <= 24) score += 6;
  else if (age >= 96) score -= 10;

  // Engagement — moderate boost (up to +15)
  const eng = raw.metrics.engagement ?? 0;
  if (eng >= 50) score += 15;
  else if (eng >= 10) score += 8;
  else if (eng >= 3) score += 3;

  // Hard floors
  if (raw.excerpt.length < 30) score -= 8;
  if (raw.author.toLowerCase().includes("bot")) score -= 10;

  return Math.max(0, Math.min(100, Math.round(score)));
}
