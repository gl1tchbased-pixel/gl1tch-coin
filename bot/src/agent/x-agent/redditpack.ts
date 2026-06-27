/** Reddit Pack — 4 subreddit-optimized posts for $GL1TCH growth.
 *  Each post matches the sub's voice + format. Reddit is THE high-leverage
 *  free channel for memecoin discovery; SatoshiStreetBets / CryptoMoonShots
 *  have real degen audiences. Drives traffic IF format matches the sub. */

export interface RedditPost {
  sub: string;
  url: string; // direct post link
  title: string;
  body: string;
  notes: string; // posting strategy / sub rules
}

export const REDDIT_HEADER =
  "<b>📕 $GL1TCH — REDDIT POST PACK</b>\n\n" +
  "Reddit is the highest-leverage <b>free</b> channel for memecoin discovery. " +
  "4 posts below — each tuned to a specific sub's voice and rules. <i>Copy → " +
  "open sub → paste → post.</i>\n\n" +
  "<b>⚠ Reddit account hygiene FIRST:</b>\n" +
  "• Account &lt; 30 days OR &lt; 100 comment karma → auto-flagged as spam\n" +
  "• If your account is new: comment 5-10 times in unrelated subs (gaming, " +
  "memes, fitness) <b>before</b> posting. Build base karma.\n" +
  "• Never post the same content in 2 subs within 1 hour\n" +
  "• Always reply to commenters within first 30 minutes — engagement boosts ranking\n\n" +
  "<b>Order to post (most → least lenient):</b>\n" +
  "1. r/SatoshiStreetBets (degen, casual rules)\n" +
  "2. r/pumpfun (small, niche)\n" +
  "3. r/solana (conservative, build angle)\n" +
  "4. r/CryptoMoonShots (strict mod approval, may reject low-MC)";

export const REDDIT_POSTS: RedditPost[] = [
  {
    sub: "SatoshiStreetBets",
    url: "https://reddit.com/r/SatoshiStreetBets/submit",
    title:
      "Found a Solana meme that shipped the audit BEFORE the pump — $GL1TCH",
    body:
      "Not financial advice. Just sharing because the homework is rare.\n\n" +
      "Most pump.fun coins die in 24h. Found one that did the opposite — shipped " +
      "every trust signal on day 1, then started the slow burn instead of the rug.\n\n" +
      "**$GL1TCH (Solana, Pump.fun)**\n\n" +
      "What I verified myself before posting:\n\n" +
      "- ✅ Mint authority: **null** (Solscan, verifiable in 30 sec)\n" +
      "- ✅ Freeze authority: **null**\n" +
      "- ✅ Tax: **0%** (Token-2022, transfer-fee extension never enabled)\n" +
      "- ✅ RugCheck risk score: **1/Low**, 0 risks flagged\n" +
      "- ✅ Founder dev-buy: **3.57%**, bought from the open curve same price as everyone\n" +
      "- ✅ Give-back wallet: public on-chain (CSxey8FbMS5dDG7Z5usH9gmXgLQqXTN6m25NRdqAC6g4)\n" +
      "- ✅ Real utility shipped on day 1: hold → /verify in their TG bot → " +
      "tier-gated private rooms (Observer → Infected → Bearer → Core → Ghost)\n\n" +
      "CA: `3HQJwwHvzy8pGkPqGQcb4thZCH88MUCHVVSNtHn6pump`\n\n" +
      "**Why this stands out:** the whole 'audit your coin' meta is fake until " +
      "someone actually does it. RugCheck.xyz/tokens/3HQJwwHvzy8pGkPqGQcb4thZCH88MUCHVVSNtHn6pump " +
      "— see for yourself.\n\n" +
      "**Risk:** still low MC, still on the bonding curve. Could die like 99% " +
      "of pump.fun coins. But unlike most, you can verify it WON'T rug.\n\n" +
      "DYOR. Just sharing the homework.",
    notes:
      "Most lenient sub. Post anytime EXCEPT 02:00-06:00 UTC. Best window: 14:00-18:00 UTC (US degens). Reply to every comment in first hour.",
  },
  {
    sub: "pumpfun",
    url: "https://reddit.com/r/pumpfun/submit",
    title: "Curve-stage $GL1TCH — utility before MC, audit before the pump",
    body:
      "Most coins on this sub launch and pray. $GL1TCH did the opposite: " +
      "shipped the trust stack before asking for attention. Sharing because the " +
      "approach is rare and might be useful to others here.\n\n" +
      "**On day 1 of launch:**\n\n" +
      "- Token-2022 mint with 0% transfer fee (audited via RugCheck = 1/Low)\n" +
      "- Mint + freeze authority renounced (Solscan-verifiable)\n" +
      "- Holder-gated Telegram rooms went live (signature-based /verify, read-only)\n" +
      "- Public on-chain give-back wallet — every disbursement = a tx\n" +
      "- Founder dev-buy 3.57% from the open curve, no presale\n\n" +
      "Five tiers (Observer → Infected → Bearer → Core → Ghost), each unlocks a " +
      "deeper TG room. Hold to climb. That's the whole utility — one thing, " +
      "shipped, not a 6-month roadmap.\n\n" +
      "CA: `3HQJwwHvzy8pGkPqGQcb4thZCH88MUCHVVSNtHn6pump`\n\n" +
      "Site: coin-three-mu.vercel.app\n\n" +
      "Curve hasn't graduated yet — still early. Sharing the build approach in " +
      "case anyone here is launching and wants a template for shipping clean.",
    notes:
      "Niche sub. Lean into the 'I'm a builder' angle — they respect process over hype. Avoid emojis. Best window: 14:00-22:00 UTC.",
  },
  {
    sub: "solana",
    url: "https://reddit.com/r/solana/submit",
    title:
      "Lessons from shipping a Solana meme with Token-2022 zero-tax on day 1",
    body:
      "Posting because the meme-coin discourse on r/solana is usually 'they're " +
      "all scams' vs 'they're the chain'. Wanted to share a build perspective " +
      "from a recent launch that took the harder path.\n\n" +
      "**Choices that mattered (and why):**\n\n" +
      "**1. Token-2022 mint, NO transfer-fee extension enabled**\n" +
      "Most memes go 5% buy/sell tax 'for marketing'. We left the transfer-fee " +
      "extension off entirely — 0% in, 0% out at the protocol level. Verifiable " +
      "on Solscan: the mint program is Token-2022 (TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb), " +
      "transferFeeConfig field absent.\n\n" +
      "**2. Mint + freeze authority renounced before announcing CA**\n" +
      "Both set to null at launch. Means no new tokens can ever be minted and " +
      "no wallet can ever be frozen. Costs ~0.001 SOL — most teams skip 'to " +
      "keep optionality'. That optionality IS the risk.\n\n" +
      "**3. Signature-based holder gating (not Collab.Land, not address-paste)**\n" +
      "Telegram bot issues a one-time nonce → user signs FREE off-chain message " +
      "on the website → bot's endpoint verifies ed25519 sig, reads balance, " +
      "DMs single-use tier room invite. No private key request. No spend " +
      "approval. Read-only utility done correctly.\n\n" +
      "**4. Public on-chain give-back wallet**\n" +
      "Every disbursement = a Solana transaction anyone can audit. No PDFs, " +
      "no screenshots. Just the chain.\n\n" +
      "**5. RugCheck / SolSniffer at launch as baseline trust**\n" +
      "Not paid CertiK — free, instant, public. RugCheck pulled 1/Low with 0 " +
      "risks flagged. Posted the link before the price action started.\n\n" +
      "Project is $GL1TCH (CA `3HQJwwHvzy8pGkPqGQcb4thZCH88MUCHVVSNtHn6pump`). " +
      "Not posting for the chart — posting because Solana memes can be done with " +
      "a higher bar and most teams just choose not to. Sharing the playbook in " +
      "case it's useful.\n\n" +
      "Site: coin-three-mu.vercel.app · RugCheck verify: rugcheck.xyz/tokens/3HQJwwHvzy8pGkPqGQcb4thZCH88MUCHVVSNtHn6pump",
    notes:
      "Conservative sub. Lead with technical/build value. Avoid 'gem', 'moon', '100x' — those get downvoted/removed. Best window: 13:00-17:00 UTC (US work hours).",
  },
  {
    sub: "CryptoMoonShots",
    url: "https://reddit.com/r/CryptoMoonShots/submit",
    title:
      "$GL1TCH (Solana) — Token-2022 0 tax, mint+freeze revoked, RugCheck 1/Low, holder-gated utility",
    body:
      "**Coin:** $GL1TCH\n" +
      "**Chain:** Solana (Pump.fun)\n" +
      "**Contract:** `3HQJwwHvzy8pGkPqGQcb4thZCH88MUCHVVSNtHn6pump`\n" +
      "**Supply:** 1,000,000,000 — fixed forever (mint authority null)\n" +
      "**Tax:** 0% buy / 0% sell (Token-2022, no transfer-fee extension)\n" +
      "**Liquidity:** still on Pump.fun bonding curve (pre-graduation)\n" +
      "**Site:** coin-three-mu.vercel.app\n\n" +
      "**🛡 Audit / Trust (all verifiable on-chain right now):**\n" +
      "- RugCheck risk score: **1/Low** (0 risks flagged) — rugcheck.xyz/tokens/3HQJwwHvzy8pGkPqGQcb4thZCH88MUCHVVSNtHn6pump\n" +
      "- Mint authority: **revoked (null)**\n" +
      "- Freeze authority: **revoked (null)**\n" +
      "- Public give-back wallet (on-chain, audit anytime): `CSxey8FbMS5dDG7Z5usH9gmXgLQqXTN6m25NRdqAC6g4`\n" +
      "- No presale. No allocation. No vesting. No team wallet.\n" +
      "- Founder dev-buy: **3.57%**, bought from the open curve same price as " +
      "everyone\n\n" +
      "**📦 Utility (shipped on day 1):**\n" +
      "Five-tier holder-gated Telegram rooms (Observer → Infected → Bearer → " +
      "Core → Ghost). Hold $GL1TCH → DM the official bot → /verify → sign a " +
      "FREE off-chain message → bot reads your wallet → DMs the tier room " +
      "invite. Read-only signature flow — never asks for seed or spend authority.\n\n" +
      "**👥 Socials:**\n" +
      "- X: x.com/gl1tchbased\n" +
      "- Telegram: t.me/gl1tch_infected\n" +
      "- DexScreener: dexscreener.com/solana/3HQJwwHvzy8pGkPqGQcb4thZCH88MUCHVVSNtHn6pump\n\n" +
      "**⚠ Risks:**\n" +
      "Low MC, low organic activity (Jupiter standard 'new listing' warnings). " +
      "Could die like most pump.fun launches. Difference is: you can verify " +
      "it CAN'T rug. DYOR.",
    notes:
      "STRICT mod approval. Requires 200+ holders typically — may auto-reject pre-graduation. Post anyway; sub publishes ~30% of submissions. Use exact field format above (Coin/Chain/Contract block) — mods autoreject malformed posts.",
  },
];

export const REDDIT_FOOTER =
  "<b>📈 What to do after posting</b>\n\n" +
  "1. <b>Stay in the comments for 30 min</b> — answer every question. Engagement " +
  "in first hour is what pushes the post up.\n" +
  "2. <b>Cross-link in TG group</b>: pin the post link, say 'we're live on " +
  "r/&lt;sub&gt; — engage if you have time'. Native Telegram members upvoting + " +
  "commenting boosts the post significantly.\n" +
  "3. <b>Track impressions / upvotes after 12h</b>: if a post breaks 50 upvotes " +
  "or 100 comments, write a follow-up post in the same sub 2-3 days later with " +
  "a different angle (e.g. 'follow-up on $GL1TCH: holders went from X to Y'). " +
  "Build a series.\n" +
  "4. <b>If a post is removed</b>: don't argue with mods. Read sub rules, find " +
  "what tripped it, repost in a more lenient sub.\n\n" +
  "<i>Tip: NEVER buy upvotes or comments. Reddit's spam detection is much " +
  "better than X's — fake activity gets the whole sub to ban GL1TCH.</i>";
