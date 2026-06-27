/** KOL Outreach Playbook — templates the founder uses to:
 *   1. Reach out cold to nano/micro-KOLs ($10-150/post range)
 *   2. Decline the daily DM grift ("Strong branding, message me for collab")
 *   3. Filter real KOLs from fake-follower farms
 *
 *  The single source of truth for outreach voice. Delivered via /xkol. */

export interface KolTemplate {
  id: string;
  title: string;
  when: string;
  body: string;
}

export const KOL_HEADER =
  "<b>🎯 $GL1TCH — KOL OUTREACH PLAYBOOK</b>\n\n" +
  "Goal: get real Solana eyeballs on $GL1TCH via micro-influencers (1k-25k real " +
  "followers). Cards below give you 5 ready DMs. <i>Copy → DM → paste.</i>\n\n" +
  "<b>Why this works</b>\n" +
  "Macro KOLs ($500+/post) at our MC are wasteful — most followers are bots, ROI " +
  "near zero. Nano/micro KOLs with engaged audiences are the sweet spot.\n\n" +
  "<b>Budget framework</b>\n" +
  "• Nano (1-5k real followers): <b>$10-30</b>/post\n" +
  "• Small (5-25k): <b>$50-150</b>/post\n" +
  "• Mid (25-100k): $200-500 — skip until $50k+ MC\n" +
  "• Macro (100k+): skip entirely now\n\n" +
  "<b>Suggested first batch:</b> 5 nano-KOLs × ~$20 = <b>$100</b>. If 1-2 hit, " +
  "ROI positive immediately. If 0 hit, you learned the audience for next round.";

export const KOL_VETTING_CARD =
  "<b>🔍 30-SECOND KOL VETTING</b>\n\n" +
  "Before DMing or paying, check:\n\n" +
  "✓ <b>Engagement rate</b>: avg likes ÷ followers > 1% on last 5 posts\n" +
  "✓ <b>Reply quality</b>: real people replying, not all 'gm' bot accounts\n" +
  "✓ <b>Account age</b>: 6+ months old\n" +
  "✓ <b>Niche fit</b>: posts about Solana / pump.fun / memecoins, not random\n" +
  "✓ <b>Past shoutouts visible</b>: can you trace coins they've shilled? Did they pump?\n\n" +
  "<b>🚨 Red flags — walk away:</b>\n" +
  "✗ Mass-DMs you within 5 seconds of follow (bot)\n" +
  "✗ Refuses to show recent engagement analytics\n" +
  "✗ Asks for full payment upfront in USDT (no work, no escrow)\n" +
  "✗ Follower count jumped 10x in last month (bought)\n" +
  "✗ Replies are 90% generic emoji or 'great project 🔥' (fake activity)";

export const KOL_TEMPLATES: KolTemplate[] = [
  {
    id: "opener-nano",
    title: "1️⃣ Cold opener — nano-KOL ($10-30 range)",
    when:
      "First DM to a 1-5k real-follower account that posts about Solana memecoins",
    body:
      "Hey — saw your take on [their recent post topic]. Sharp call.\n\n" +
      "Running an outreach round for $GL1TCH (Solana, audit-shipped on day 1: " +
      "RugCheck 1, 0 tax, mint+freeze null). Budget for nano-KOLs with real " +
      "engagement: $20/post for one genuine tweet about the project.\n\n" +
      "If interested I'll send the brief + key facts. If not, no worries — " +
      "just had to ask the right voices first.\n\n" +
      "coin-three-mu.vercel.app",
  },
  {
    id: "opener-mid",
    title: "2️⃣ Cold opener — small KOL ($50-150 range) + value-add",
    when:
      "5-25k follower account with strong meme-coin niche — offer money + early tier access",
    body:
      "Hey — your $WIF / $BONK calls actually had thesis behind them, rare.\n\n" +
      "Launched $GL1TCH last week — Solana meme with one utility (holder-gated " +
      "Telegram rooms), zero tax, RugCheck 1/Low, public give-back wallet.\n\n" +
      "For one genuine tweet (your voice, not a script): $80 + a permanent " +
      "Genesis Bearer tier badge in our private holder rooms.\n\n" +
      "If thesis lands for you, brief is ready. If not, no pressure — bag the " +
      "smaller calls.\n\n" +
      "coin-three-mu.vercel.app",
  },
  {
    id: "followup",
    title: "3️⃣ Follow-up (48h no response)",
    when:
      "Sent opener, no answer after 2 days, want to bump without being annoying",
    body:
      "No worries if not a fit — just bumping in case the first DM got buried.\n\n" +
      "Quick: $GL1TCH is a Solana meme that shipped the audit on day 1 " +
      "(RugCheck 1, 0 tax, mint+freeze null). One utility — hold to climb tier-gated " +
      "rooms. $20 per genuine tweet, your voice.\n\n" +
      "Pass is fine — won't bug again. If interested, ⬆.",
  },
  {
    id: "confirm",
    title: "4️⃣ Confirmation — once they agree, lock terms",
    when:
      "KOL said yes. Pin down deliverables BEFORE sending payment.",
    body:
      "🤝 Locking it in:\n\n" +
      "• <b>Deliverable</b>: 1 original tweet about $GL1TCH (your angle, not a " +
      "script). Mention CA: 3HQJwwHvzy8pGkPqGQcb4thZCH88MUCHVVSNtHn6pump\n" +
      "• <b>Payment</b>: $20 in SOL, sent 50% now / 50% after post goes live\n" +
      "• <b>Timing</b>: post within 48h of payment\n" +
      "• <b>Stays up</b>: at least 7 days, not deleted\n\n" +
      "Your SOL address?\n\n" +
      "Key facts brief: 0 tax (Token-2022), mint+freeze revoked, RugCheck 1/Low " +
      "0 risks, give-back wallet on-chain, founder bought 3.57% on open curve.",
  },
  {
    id: "decline-grift",
    title: "5️⃣ Decline incoming grifters (DMs you with 'collab' offer)",
    when:
      "Someone DMs you 'strong branding, message me for collab' / 'shoutout for $X'",
    body:
      "Appreciate the reach. $GL1TCH only does public-stated rates and we vet " +
      "engagement before paying.\n\n" +
      "If you want to pitch:\n" +
      "1. Drop a screenshot of last 30d analytics (impressions/engagement)\n" +
      "2. Your fixed rate per post\n" +
      "3. 3 prior shoutouts I can verify\n\n" +
      "If those check out, happy to talk. Otherwise we're set — admins never " +
      "DM first on our side either.",
  },
];

export const KOL_FOOTER =
  "<b>📤 Workflow</b>\n\n" +
  "1. Browse X with terms like <i>'pumpfun gem'</i>, <i>'sol low cap'</i>, " +
  "<i>'$WIF $BONK'</i> — find accounts that match the vetting checklist\n" +
  "2. Run them through the 30-sec vetting card above\n" +
  "3. DM with template 1 or 2 (long-press the code block → Copy)\n" +
  "4. If no answer in 48h, send template 3 ONCE — never more\n" +
  "5. On accept → template 4, lock terms, pay 50%\n" +
  "6. After their post lives 24h, send the rest + ask if they want a follow-up slot\n\n" +
  "<i>Tip: track every payment + URL of their post in a simple note. After 5 " +
  "KOLs you'll know exactly which $ tier converts. That's your real spend roadmap.</i>";
