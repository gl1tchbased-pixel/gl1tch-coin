/** Genesis 100 Campaign — gamify the first 100 holders.
 *  Free, organic FOMO mechanism. People who feel "I'm in the founder cohort"
 *  retweet 10x more, defend the project in fights, hold longer.
 *
 *  Kit includes: X announcement thread, pinned TG message, site copy proposal,
 *  and how to track + award the badge. */

export const GENESIS_HEADER =
  "<b>🪙 $GL1TCH — GENESIS 100 CAMPAIGN KIT</b>\n\n" +
  "<b>Idea:</b> the first 100 wallets to hold ≥100k $GL1TCH (= Infected tier) " +
  "get a permanent <b>GENESIS</b> badge on their TG profile + lifetime access " +
  "to a Genesis-only private room. Costs you $0. Creates real, organic FOMO.\n\n" +
  "<b>Why it works:</b>\n" +
  "• 'Genesis' is a permanent, ego-anchored ID — buyers race to claim it\n" +
  "• Existing holders retweet to lock their spot (free amplification)\n" +
  "• Creates a defensible insider class who fights for the project for free\n" +
  "• Gives you a closed group of 100 evangelists with real $$$ committed\n\n" +
  "<b>What to ship:</b>\n" +
  "1. The announcement tweet (Card 1 below)\n" +
  "2. The pinned TG group message (Card 2)\n" +
  "3. (Optional) A /genesis page on the site listing the wallets\n" +
  "4. The tracking method (Card 3)";

export const GENESIS_CARDS = [
  {
    title: "🐦 Card 1 — X announcement (pin this)",
    when: "Post as new tweet, pin replacing current pin (or add to thread)",
    body:
      "Announcing $GL1TCH — GENESIS 100.\n\n" +
      "The first 100 wallets to hold ≥100,000 $GL1TCH get a permanent GENESIS " +
      "badge:\n" +
      "✓ Lifetime access to a Genesis-only TG room\n" +
      "✓ Public on-chain recognition (wallets listed on site)\n" +
      "✓ Direct line to the core for the life of the project\n\n" +
      "Verifiable. Final. No re-rolls.\n\n" +
      "Once 100 wallets claim, GENESIS closes forever.\n\n" +
      "CA: 3HQJwwHvzy8pGkPqGQcb4thZCH88MUCHVVSNtHn6pump",
  },
  {
    title: "📌 Card 2 — Telegram pinned message (HTML)",
    when: "Replace current group pin OR pin after current pin",
    body:
      "<b>GENESIS 100 — claim the founder cohort</b>\n\n" +
      "The first 100 wallets to hold ≥100,000 $GL1TCH unlock <b>GENESIS</b> — " +
      "a permanent on-chain founder badge.\n\n" +
      "Once claimed, GENESIS closes forever.\n\n" +
      "<b>What you get:</b>\n" +
      "• Lifetime access to the Genesis-only room (closed when 100 fill)\n" +
      "• Public recognition on the site's Genesis wall\n" +
      "• Direct line to the core team\n\n" +
      "<b>How to claim:</b>\n" +
      "① Hold ≥100,000 $GL1TCH (Infected tier or above)\n" +
      "② DM this bot: /verify → sign the free message\n" +
      "③ Bot auto-promotes you to Genesis when verified balance &gt;= 100k AND " +
      "you're among the first 100 wallets to verify at that level\n\n" +
      "Slots: 100. Filled: tracked on coin-three-mu.vercel.app/genesis\n\n" +
      "Pump.fun: pump.fun/coin/3HQJwwHvzy8pGkPqGQcb4thZCH88MUCHVVSNtHn6pump",
  },
  {
    title: "🛠 Card 3 — Tracking mechanism (no code change required)",
    when: "Operate manually for first round — automate later",
    body:
      "MANUAL TRACKING (works today, $0):\n\n" +
      "1. Every time a holder runs /verify in the bot, the bot already logs " +
      "their wallet + balance + Telegram ID in console logs.\n" +
      "2. After /verify, ADMIN manually:\n" +
      "   • Notes the wallet + TG username\n" +
      "   • If balance ≥ 100k AND total claimed &lt; 100, marks them GENESIS\n" +
      "   • Promotes them in the Genesis-only TG room\n" +
      "3. Tracking spreadsheet: just a Telegram saved-message list:\n" +
      "   01. <code>3HQJ...abc</code> · @username · 2026-05-30\n" +
      "   02. <code>3HQJ...def</code> · @username · 2026-05-30\n" +
      "   ...\n\n" +
      "AUTOMATED TRACKING (next iteration, ~30 min build):\n" +
      "When you hit 20-30 verified holders, ask Claude to add a /genesisclaim " +
      "command that auto-issues the badge + updates a JSON file with the list. " +
      "Until then manual is faster than building.",
  },
  {
    title: "📢 Card 4 — Daily progress tweet (template)",
    when: "Tweet once per day during the campaign to maintain urgency",
    body:
      "GENESIS 100 — DAY [N]\n\n" +
      "Claimed: [X] / 100\n" +
      "Remaining: [100-X]\n\n" +
      "The closer to 100, the louder the room gets.\n\n" +
      "[Optional: shout out the newest GENESIS holder's wallet last 4 chars " +
      "with a 'welcome' line]\n\n" +
      "$GL1TCH · t.me/gl1tch_infected",
  },
];

export const GENESIS_FOOTER =
  "<b>📊 Why this matters more than KOLs</b>\n\n" +
  "1 paid KOL post = ~24h impression spike, then forgotten.\n" +
  "100 Genesis holders = 100 lifetime evangelists who defend the bag and " +
  "retweet every milestone — for free.\n\n" +
  "<b>Best moment to launch this campaign:</b> right now. Each Genesis spot " +
  "is worth ~$15-50 in 'savings' vs hiring a KOL with similar amplification " +
  "value. Costs you nothing but the social capital of a closed room.\n\n" +
  "<b>Pro move:</b> when 100 GENESIS fills, immediately announce GENESIS-2 " +
  "(spots 101-200 with smaller perks). Maintain momentum without diluting the " +
  "original cohort's status.";
