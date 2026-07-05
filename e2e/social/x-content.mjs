// Curated X content calendar for $GL1TCH — investor-grade, one post/day, rotating.
// Every post is a standalone tweet (<=280) with a hook + one link. Angles cover every
// feature we shipped, the rug-proof tokenomics, and the free/non-custodial ethos.
// Deterministic day-picker so it walks the whole set before repeating.

const SITE = "coin-three-mu.vercel.app";

export const POSTS = [
  // --- Signal Graph (the differentiator) ---
  `Every scanner checks one token and forgets.

$GL1TCH's Signal Graph remembers every deployer it has seen. Ship two rugs, and any fresh token from that wallet is flagged ⚠ Serial deployer — before anyone buys.

${SITE}/scan`,

  `"But the contract looks clean."

So did the last 3 this wallet deployed — right before they rugged.

$GL1TCH's Signal Graph scores the deployer's whole history, not just today's token. Memory is the edge.

${SITE}/scan`,

  // --- Proof-of-Signal ---
  `Reputation you can't fake or buy.

Proof-of-Signal fuses verified *sustained* holding (7-day average — a balance flashed for one block earns nothing) with the community you bring in.

Climb Dormant → Beacon Prime. Status only, no paid rewards.

${SITE}/ranks`,

  // --- Security / trust ---
  `A tool that tells you what's safe has to be safe itself.

$GL1TCH never asks for a fund or approval signature. Strict CSP. Automated secret + dependency scans. Public threat model. Responsible disclosure.

Don't trust us — verify: ${SITE}/security`,

  `We scanned our own token, live, and published the result.

Most projects ask for trust. We hand you the receipts and say: check for yourself.

${SITE}/proof`,

  // --- Scanner core ---
  `Paste any token. Any chain. Get a plain-English verdict in seconds — free.

Mint & freeze authority, LP lock, holder concentration, insiders, honeypot signals, deployer history. Cross-checked across live sources.

${SITE}/scan`,

  `Scanning is free and always will be.

Holding $GL1TCH unlocks convenience — speed, depth, automation. Never the protection itself. A safety tool you have to pay to be safe from isn't a safety tool.

${SITE}/scan`,

  // --- Rug Radar ---
  `Most scanners wait for you to ask. $GL1TCH hunts.

Rug Radar sweeps freshly-launched Solana tokens every hour, scores each one, and flags the rugs — live. Riskiest first.

${SITE}/radar`,

  // --- Watchtower / Wallet Watch ---
  `Scan once, then stop watching? No.

/watch any token in the $GL1TCH bot and get pinged the moment its safety score drops. Set-and-forget rug defense.

${SITE}`,

  `Track a whale or a dev wallet — get alerted the second they sell or move out.

Wallet Watch, in the $GL1TCH Telegram bot. Free.

${SITE}`,

  // --- Tokenomics / rug-proof ---
  `$GL1TCH, on protocol level:

✓ Mint authority — revoked
✓ Freeze authority — revoked
✓ 0% tax (Token-2022, verified)
✓ Fixed 1B supply
✓ RugCheck: Low risk, 0 flags

Not a promise. What you see on-chain is what exists.

${SITE}`,

  // --- AI-agent narrative ---
  `They wanted an AI that obeys.

We shipped one that reads the chain, remembers every rug, and warns you before you ape.

$GL1TCH — the rogue-AI that works for holders, not deployers.

${SITE}/scan`,

  // --- Investor angle ---
  `Most memecoins are a bet on attention.

$GL1TCH is a bet on a product people actually use: a free multi-chain rug scanner, a live rug radar, a deployer-memory Signal Graph, holder-gated tools.

Utility first. The meme carries it.

${SITE}`,

  `The "one utility" trap: most tokens have zero.

$GL1TCH has a working one — a token-safety engine used on any chain — plus a reputation layer you earn, not buy.

Judge the product: ${SITE}/scan`,

  // --- Education / hooks ---
  `Before you buy that new token, ask three things:

1. Can the dev mint more? (authority)
2. Can they freeze your wallet?
3. Is the liquidity locked?

Or just paste it here and get all three in seconds — free:
${SITE}/scan`,

  `"How do I know it's not a honeypot?"

Paste the contract into $GL1TCH. We simulate the sell side and check transfer traps, so you find out before your money does.

${SITE}/scan`,

  `Serial ruggers reuse wallets. They think no one's keeping score.

$GL1TCH is. Every deployer we've seen, every token, every outcome — remembered. The Signal Graph doesn't forget.

${SITE}/scan`,

  `Green candles hide red flags.

$GL1TCH reads the flags: insider bundling, sniper clusters, fake liquidity, mutable metadata, active mint authority. In plain English, for free.

${SITE}/scan`,
];

/** Deterministic day index → post, walking the whole set before repeating. */
export function postForDay(date = new Date()) {
  const dayNum = Math.floor(Date.parse(date.toISOString().slice(0, 10)) / 86400000);
  return POSTS[((dayNum % POSTS.length) + POSTS.length) % POSTS.length];
}
