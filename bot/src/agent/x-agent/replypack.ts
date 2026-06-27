/** Reply Pack — 15 curated Solana ecosystem X accounts the founder can engage
 *  with to surface $GL1TCH in front of relevant audiences. Each entry includes
 *  a trigger (when to use it) and a brand-aligned reply template. Templates
 *  are evergreen-style so they fit most of the account's typical tweets.
 *
 *  Usage rules (in the message header):
 *   - Don't spam — max 1-2 replies per account per week
 *   - Reply only when the account's tweet topic matches the trigger
 *   - Lead with value, mention $GL1TCH last
 *   - Skip if their tweet is personal/unrelated */

export interface ReplyTemplate {
  handle: string;
  bio: string;
  trigger: string;
  reply: string;
}

export const REPLY_PACK: ReplyTemplate[] = [
  {
    handle: "aeyakovenko",
    bio: "Solana co-founder · Anatoly",
    trigger: "tweets about SOL speed/throughput/TPS/builder culture",
    reply:
      "Solana shipping fast enough to host actual on-chain memes — $GL1TCH is Token-2022 with 0 transfer fee, verifiable in 200ms. The chain matters more than the meme.",
  },
  {
    handle: "rajgokal",
    bio: "Solana co-founder",
    trigger: "ecosystem health, builder vibes, founder threads",
    reply:
      "Builder culture on SOL is real — shipped holder-gated Telegram rooms from a Pump.fun launch in 24h ($GL1TCH). Audit + utility same week. This is the chain.",
  },
  {
    handle: "0xMert_",
    bio: "Helius CEO · RPC infra",
    trigger: "anything RPC, devnet, ecosystem latency, dev tooling",
    reply:
      "Built our holder-gating signature flow on Helius — read-only, no spend authority, ~200ms verify. $GL1TCH. RPC quality matters when utility isn't fake.",
  },
  {
    handle: "MustStopMurad",
    bio: "Memecoin commentator · meme-cycle theses",
    trigger: "takes on memecoin lifecycle, scam vs real, narrative shifts",
    reply:
      "The audit-shipped meme is rare on SOL. RugCheck 1/Low, mint+freeze null, 0 tax — happens to be the case for $GL1TCH. Different model from the usual.",
  },
  {
    handle: "theunipcs",
    bio: "Bonk Guy · viral memecoin trader",
    trigger: "pump.fun finds, calling new coins, meme reviews",
    reply:
      "Watching one with utility-first posture: $GL1TCH. Tier-gated TG rooms for holders, public give-back wallet, founder bag 3.57% from the open curve.",
  },
  {
    handle: "ansemtrades",
    bio: "Trader · chart calls",
    trigger: "low-cap finds, technical setups, SOL spec plays",
    reply:
      "Low cap clean spec on SOL: mint+freeze revoked, RugCheck 1, Token-2022 zero tax, founder dev-buy 3.57% on-curve. $GL1TCH. DYOR.",
  },
  {
    handle: "pumpdotfun",
    bio: "Pump.fun official",
    trigger: "feature launches, ecosystem updates, success stories",
    reply:
      "Holder-gated utility shipped day-one from a Pump.fun launch ($GL1TCH). Bot reads balance via free signature, DMs tier room invites. Curve → utility, fast.",
  },
  {
    handle: "gakonst",
    bio: "Paradigm / Foundry founder",
    trigger: "L1 comparisons, ecosystem architecture, protocol takes",
    reply:
      "Solana letting memes ship the utility on launch day, not a 6-month roadmap. $GL1TCH did /verify + holder-gated rooms in week 1. Builder culture is different here.",
  },
  {
    handle: "SolanaFloor",
    bio: "Solana ecosystem news",
    trigger: "ecosystem trends, weekly reports, builder spotlights",
    reply:
      "Adding to the audit-shipped SOL meme list: $GL1TCH. RugCheck 1, public give-back wallet, 0 tax, Token-2022. The floor for new launches is rising.",
  },
  {
    handle: "phantom",
    bio: "Phantom wallet",
    trigger: "wallet features, security UX, holder tools",
    reply:
      "Our holder-gating only asks for a free signature in Phantom — never a spend. $GL1TCH. Read-only utility done right; pattern more memes should copy.",
  },
  {
    handle: "JupiterExchange",
    bio: "Jupiter aggregator",
    trigger: "aggregator updates, new tokens, trader UX",
    reply:
      "$GL1TCH (Token-2022, 0 transfer fee) routes cleanly through Jupiter — three standard JupShield warnings clear up as organic activity ramps. Built right from launch.",
  },
  {
    handle: "raydiumprotocol",
    bio: "Raydium DEX",
    trigger: "liquidity updates, AMM features, pool launches",
    reply:
      "$GL1TCH still on the Pump.fun curve, but Path B (Raydium CPMM + LP burn) already coded — burns happen the second curve graduates. No 'soon™'.",
  },
  {
    handle: "BackpackApp",
    bio: "Backpack wallet · xNFT",
    trigger: "wallet features, builder spotlights, Solana UX",
    reply:
      "Read-only signature flow we shipped for $GL1TCH tier rooms — Phantom + Backpack both treat it as a free message, no spend authority. The correct UX for utility memes.",
  },
  {
    handle: "magiceden",
    bio: "Magic Eden marketplace",
    trigger: "community drops, holder-gated experiences, creator tools",
    reply:
      "Borrowed the holder-gate pattern from NFT mints for $GL1TCH — tier-gated TG rooms tied to on-chain balance, read-only verify. Memes can learn from NFT UX.",
  },
  {
    handle: "cookerflips",
    bio: "Memecoin trader · thesis poster",
    trigger: "meme-coin theses, 'the play', low-cap analysis",
    reply:
      "If you want the audit-shipped + utility-first thesis on SOL: $GL1TCH. Tier rooms, public give-back wallet (CSxey8...), RugCheck 1. Not 'soon' — already.",
  },
];

/** Header message describing how to use the pack. */
export const PACK_HEADER =
  "<b>📦 $GL1TCH REPLY PACK — 15 SOL TARGETS</b>\n\n" +
  "Each card below is a Solana account worth engaging with. Open profile " +
  "(button) → scroll for a recent tweet matching the <i>trigger</i> → tap " +
  "Reply → paste the prepared reply. The replies are evergreen — they fit " +
  "most of the account's typical tweets.\n\n" +
  "<b>Rules:</b>\n" +
  "• Max 1-2 replies/account/week (else looks like spam)\n" +
  "• Only reply when trigger matches their tweet\n" +
  "• Lead with value, mention $GL1TCH last\n" +
  "• Skip if their tweet is personal / unrelated\n\n" +
  "<i>For custom replies on specific tweets, use /xreply &lt;tweet URL&gt;.</i>";
