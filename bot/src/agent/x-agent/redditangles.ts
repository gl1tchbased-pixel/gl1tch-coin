/** Reddit Comment Angles — ready-to-paste comments tuned to specific Reddit
 *  thread patterns. Different angle each sweep (rotated by timestamp). The
 *  founder browses the suggested subs, finds a matching thread, drops the
 *  comment. Less risk than original posts; better for warming up accounts. */

export interface RedditAngle {
  id: string;
  trigger: string; // what kind of thread to look for
  subs: string[]; // subs where this fits
  comment: string;
}

export const REDDIT_ANGLES: RedditAngle[] = [
  {
    id: "best-sol-meme",
    trigger: "thread asking 'best Solana memecoin to look at?' / 'any clean SOL launches?'",
    subs: ["r/solana", "r/CryptoCurrency", "r/SatoshiStreetBets"],
    comment:
      "Disclosure upfront: I hold $GL1TCH, take this with a grain of salt.\n\n" +
      "What pulled me in was the on-chain proof rather than the tweets — Token-2022 with the transfer-fee extension off (0% tax verifiable on Solscan), mint + freeze authorities both renounced, RugCheck pulled 1/Low with 0 risks flagged.\n\n" +
      "Real utility shipped on day 1: hold to climb tier-gated Telegram rooms, verified via free signature (no spend authority). Public on-chain give-back wallet.\n\n" +
      "Could still die like 99% of pump.fun coins — but unlike most, you can verify it won't rug. CA: 3HQJwwHvzy8pGkPqGQcb4thZCH88MUCHVVSNtHn6pump",
  },
  {
    id: "got-rugged",
    trigger: "thread 'just got rugged' / 'lost X SOL to scam token'",
    subs: ["r/solana", "r/SatoshiStreetBets", "r/CryptoCurrency"],
    comment:
      "Sorry to hear it. Common pattern lately — projects skip renouncing authorities 'to keep optionality'. That optionality IS the risk.\n\n" +
      "Free 30-second pre-buy checklist that would have flagged it:\n" +
      "1. RugCheck score (rugcheck.xyz) — anything above 200 is yellow, above 800 is red\n" +
      "2. Solscan token page — mint authority and freeze authority should both say 'null'\n" +
      "3. SolSniffer scanner — overlap check on RugCheck\n\n" +
      "If you're getting back in, $GL1TCH is one of the few new SOL launches that ticks all three. RugCheck 1/Low, both authorities null, Token-2022 with no transfer fee. (Disclosure: I'm in.)",
  },
  {
    id: "next-100x",
    trigger: "thread 'what's the next 100x?' / 'hidden gems' / 'low cap watchlist'",
    subs: ["r/SatoshiStreetBets", "r/CryptoMoonShots", "r/pumpfun"],
    comment:
      "Not promising 100x — but the asymmetry I look for is: low MC + clean trust stack + actual utility shipped, not promised.\n\n" +
      "One that fits: $GL1TCH on Solana. Still pre-graduation on pump.fun. RugCheck 1/Low, mint+freeze revoked, 0 tax (Token-2022), holder-gated TG rooms live (5 tiers from Observer to Ghost Node). Founder dev-buy 3.57% from the open curve.\n\n" +
      "Could die like most pump.fun launches. Difference is the floor below it is unusually low because trust stack already shipped. DYOR — CA `3HQJwwHvzy8pGkPqGQcb4thZCH88MUCHVVSNtHn6pump`.\n\n" +
      "(I hold, obviously.)",
  },
  {
    id: "due-diligence",
    trigger: "thread 'how do you do due diligence on memecoins?' / 'how to check if safe'",
    subs: ["r/CryptoCurrency", "r/solana", "r/altcoin"],
    comment:
      "Cheat sheet I use, in order:\n\n" +
      "1. **Solscan** the mint — check Mint Authority + Freeze Authority. Both should be 'null'. If either has an address, walk away.\n\n" +
      "2. **RugCheck.xyz** — anything above 200 score is yellow flag. Real audits sit below 100 with 0 risks flagged.\n\n" +
      "3. **SolSniffer** — second opinion. If RugCheck and SolSniffer agree, you're good.\n\n" +
      "4. **Pump.fun bonding curve % left** — too late if 90%+ filled with no real movement.\n\n" +
      "5. **Tax check** — Token-2022 mints should NOT have transferFeeConfig. Legacy SPL is harder to verify; default to 0% claim being a lie unless proven.\n\n" +
      "Recent launch that scores well across all 5: $GL1TCH (disclosure: I hold). Mostly sharing the checklist though — works on any token.",
  },
  {
    id: "sol-vs-eth",
    trigger: "thread 'SOL vs ETH memecoins' / 'why solana memes better'",
    subs: ["r/solana", "r/CryptoCurrency", "r/ethereum"],
    comment:
      "Speed is part of it, but the bigger thing is build culture — on SOL you can ship utility in week 1 instead of a 6-month roadmap.\n\n" +
      "Recent example I've been watching: $GL1TCH launched recently. By day 7 they had: full audit (RugCheck 1/Low, mint+freeze null, Token-2022 0 tax), holder-gated TG rooms with signature-based verify (no spend authority), public on-chain give-back wallet, 5 tiers of access.\n\n" +
      "Try doing all that on ETH in a week without a $100k audit invoice. SOL lets memes act like real protocols.\n\n" +
      "(Disclosure: I hold, but the build-speed point stands separately.)",
  },
  {
    id: "is-this-safe",
    trigger: "thread 'anyone know if X coin is safe?' / 'help me check this token'",
    subs: ["r/CryptoCurrency", "r/SatoshiStreetBets", "r/solana"],
    comment:
      "For any new Solana token, free 60-second verification:\n\n" +
      "- rugcheck.xyz/tokens/[CA] — score under 100 + 0 risks flagged = green\n" +
      "- solscan.io/token/[CA] — Mint Authority + Freeze Authority both 'null' = can't rug\n" +
      "- If Token-2022 mint, check transferFeeConfig field — should be absent for true 0% tax\n\n" +
      "If [the coin] doesn't pass all three, doesn't mean it WILL rug — just means it CAN.\n\n" +
      "(For reference — one that does pass cleanly: $GL1TCH. Token-2022, 0 tax verified, RugCheck 1/Low. Disclosure: I'm in.)",
  },
  {
    id: "utility-memecoins",
    trigger: "thread 'any utility memecoins?' / 'memes with actual product'",
    subs: ["r/CryptoCurrency", "r/SatoshiStreetBets", "r/solana"],
    comment:
      "Most 'utility' memecoins ship a roadmap and call it utility. Real utility = something you can use today.\n\n" +
      "Closest thing I've used recently: $GL1TCH's holder-gated tier system. Hold tokens → DM their TG bot → /verify → sign a free off-chain message → bot reads your wallet → DMs invite to your tier's private room. Read-only signature, no spend authority.\n\n" +
      "Five tiers (Observer → Infected → Bearer → Core → Ghost), each unlocks a deeper room. Not 'coming soon' — shipped on day 1.\n\n" +
      "(Disclosure: I hold. But the design pattern itself is worth borrowing for any holder-gated project.)",
  },
  {
    id: "founder-bag-concern",
    trigger: "thread complaining about founder/team bags / 'team sold' / 'dev dumped'",
    subs: ["r/SatoshiStreetBets", "r/solana", "r/CryptoCurrency"],
    comment:
      "Founder/team bags are the silent killer most people don't check until it's too late. On Solana you can verify in 30 seconds:\n\n" +
      "1. Solscan the mint → 'Top Holders' tab → see the % distribution\n" +
      "2. If top wallet holds >10% and isn't the bonding curve or a known DEX/burn address, that's your risk\n" +
      "3. Cross-check the first buy timestamp — was it the open curve or a sniper bot?\n\n" +
      "Recent SOL launch I'm holding ($GL1TCH) had the founder dev-buy 3.57% from the open curve same price as everyone — publicly documented on the site. Most projects won't disclose that.\n\n" +
      "Make this part of your standard DD.",
  },
  {
    id: "audit-vs-no-audit",
    trigger: "thread about audits / 'is CertiK enough?' / 'what audit means'",
    subs: ["r/CryptoCurrency", "r/solana", "r/altcoin"],
    comment:
      "CertiK and friends are great for protocols with code complexity. For memecoins (which are mostly just a mint + LP), they're overkill and projects use 'audit pending' as a marketing tool that never closes.\n\n" +
      "What actually matters for a meme:\n" +
      "- Mint authority null (can't print more)\n" +
      "- Freeze authority null (can't block wallets)\n" +
      "- LP burned/locked (can't pull liquidity)\n" +
      "- 0% tax (no extractive fee)\n\n" +
      "All 4 are verifiable on-chain for free in 60 seconds via RugCheck + Solscan. No paid audit needed.\n\n" +
      "$GL1TCH has all 4 + a RugCheck 1/Low score with 0 risks. (Disclosure: hold.) Free verification > expensive marketing seal.",
  },
];

export const REDDIT_ANGLE_TIP =
  "<i>Tip: open the suggested sub → sort by 'New' (last 24h) → find a thread " +
  "matching the trigger → paste comment (light edit OK). Always check the sub's " +
  "rules first; some forbid any token mention. Never spam the same comment in " +
  "2 subs within 12h.</i>";

/** Pick an angle deterministically based on a seed (so different sweeps get different angles). */
export function pickRedditAngle(seed: number): RedditAngle {
  return REDDIT_ANGLES[Math.abs(seed) % REDDIT_ANGLES.length];
}
