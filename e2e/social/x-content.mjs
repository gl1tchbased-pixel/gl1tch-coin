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

  // --- more angles ---
  `The scanner you never have to pay for.

No subscription, no wallet connect, no "premium tier" to see the risk. Paste a token, read the verdict, keep your money. That's the whole deal.

${SITE}/scan`,

  `We don't ask you to trust the team. We're anonymous.

We ask you to read the code (open source), scan our own token (we pass), and verify the on-chain facts yourself.

Trust math, not promises: ${SITE}/proof`,

  `Rugs don't announce themselves. Patterns do.

Repeat deployer. Bundled supply. Unlocked LP. Mutable metadata. $GL1TCH reads the pattern and says it in one line — before you're the exit liquidity.

${SITE}/scan`,

  `Your reputation on GL1TCH is earned, not bought.

Proof-of-Signal weighs *sustained* holding (7-day average) + the community you bring in. You can't flash-buy your way up. Climb Dormant → Beacon Prime.

${SITE}/ranks`,

  `Every scan makes the next one smarter.

Website scans, Telegram scans, the hourly Rug Radar — all feed one Signal Graph. The more it's used, the better it catches repeat ruggers. A network effect on safety.

${SITE}/scan`,

  `Checked a token on 3 sites and got 3 answers?

$GL1TCH cross-checks live sources into ONE plain-English verdict with a confidence score — and tells you which checks it couldn't verify. No black box.

${SITE}/scan`,

  `Solana moves fast. Rugs move faster.

Rug Radar sweeps freshly-launched tokens every hour and flags the dangerous ones automatically — so you see the catch before the crowd sees the chart.

${SITE}/radar`,

  // --- Agent Trust Layer / adoption (devs are the audience) ---
  `Building an AI agent that touches funds? Add a trust guardrail in one call — free, no key, no SDK:

GET /api/agent/check?address=… → { level, score, reasons }
if (level === "caution") block()

Docs: ${SITE}/agents/docs`,

  `AI agents now hold wallets and trade on-chain. Nobody checks if an agent is safe to trust.

$GL1TCH does — identity + on-chain reputation, one free call. The trust layer for the agent economy.

Know Your Agent: ${SITE}/agents`,

  `Our users are AI agents — so the whole trust API is machine-readable at /llms.txt.

An agent can discover GL1TCH and self-integrate KYA autonomously. Built for the agent economy, not just talked about.

${SITE}/llms.txt`,

  `Every on-chain agent should have a trust profile — permanent, verifiable, embeddable.

Now they do. Check any agent, or drop a live KYA badge in your dapp in one line.

${SITE}/agents/docs`,
];

// Multi-tweet threads — far higher reach than single tweets. Each inner array is one thread
// (tweet 1 = the hook, each <=280). Posted on thread days (see x-daily). Investor-facing.
export const THREADS = [
  // The investment thesis
  [
    `Most memecoins are a bet on attention. It fades, the chart dies.

$GL1TCH is a bet on a product people actually use — a free multi-chain rug scanner with a memory.

Why that's a different kind of bet 🧵`,
    `1/ The product is real and live.

Paste any token, any chain → plain-English safety verdict in seconds. Mint/freeze authority, LP lock, holder spread, honeypot traps, deployer history.

Free. Non-custodial. Try it now: ${SITE}/scan`,
    `2/ It has a moat memes don't: memory.

The Signal Graph remembers every deployer we've scanned. A wallet that shipped rugs before gets flagged on its NEXT token — before anyone buys. No single-token scanner (RugCheck, GoPlus) can do this.`,
    `3/ The tokenomics are rug-proof by design.

Mint & freeze authority revoked. 0% tax. Fixed 1B supply. RugCheck: Low risk, 0 flags. We scanned our own token live and published it.

The thing that warns you about rugs can't be one.`,
    `4/ Utility that compounds, not a one-off gimmick.

Rug Radar (live hunting), Watchtower (alerts), Proof-of-Signal (earned reputation), a Telegram bot. Every scan makes the graph smarter.

Judge the product, not the promise: ${SITE}`,
    `5/ Not financial advice — crypto is high-risk, always DYOR.

But if you're going to be in memecoins, be in one building something people open every day.

$GL1TCH — the rogue-AI that works for holders, not deployers.
${SITE}`,
  ],
  // Educational: how not to get rugged (pure value → reach + follows)
  [
    `You don't need to be technical to avoid 90% of rugs.

5 checks that take 30 seconds — a thread that could save your next bag 🧵`,
    `1/ Can the dev mint more tokens?

If the mint authority isn't revoked, they can print supply and dump on you. This is the #1 rug mechanic. Non-negotiable: it must be revoked.`,
    `2/ Can they freeze your wallet?

An active freeze authority means they can stop YOU from selling while they exit. Must be revoked too.`,
    `3/ Is the liquidity locked — and how deep?

Unlocked LP = the dev can pull it and the price goes to zero instantly. Shallow LP = one whale exit nukes you.`,
    `4/ Who holds the supply?

If the top few wallets hold most of it (insiders/snipers/bundled), they control your exit. Concentration is a red flag.`,
    `5/ Has this deployer rugged before?

The hardest to check manually — and the most predictive. Serial ruggers reuse wallets.

All 5, automated + free, any chain: ${SITE}/scan. DYOR.`,
  ],
  // Signal Graph deep-dive (the differentiator)
  [
    `Every token scanner has the same blind spot: it checks one token, then forgets.

So serial ruggers just spin up a new wallet and do it again.

We fixed that. 🧵`,
    `1/ Meet the Signal Graph.

Every token $GL1TCH scans, we remember — linked to the wallet that deployed it, and how it scored. External APIs forget. We don't.`,
    `2/ Here's the edge:

When a deployer has shipped 2+ tokens we've flagged, ANY fresh token from that wallet lights up as ⚠ Serial deployer — instantly, before it has a chart, before anyone apes.`,
    `3/ It compounds.

Every scan — from the website or the Telegram bot — feeds the graph. The more it's used, the smarter it gets. A network effect on rug detection.`,
    `4/ And it stays free.

Scanning + the verdict are free for everyone, never gated behind holding $GL1TCH. Holding unlocks convenience, never the protection.

See it: ${SITE}/scan`,
  ],
];

/** Deterministic day index → post, walking the whole set before repeating. */
export function postForDay(date = new Date()) {
  const dayNum = Math.floor(Date.parse(date.toISOString().slice(0, 10)) / 86400000);
  return POSTS[((dayNum % POSTS.length) + POSTS.length) % POSTS.length];
}

// --- Data-driven posts: inject LIVE metrics to prove robustness (credible = investor-ready) ---
const BOT = (process.env.SCAN_STATS_URL || "https://gl1tch-bot-production-3f2c.up.railway.app").replace(/\/$/, "");
const n = (x) => (typeof x === "number" ? x.toLocaleString("en-US") : x);

/** Fetch live engine metrics (null on failure). */
export async function fetchMetrics() {
  try {
    const r = await fetch(`${BOT}/signal/metrics`, { signal: AbortSignal.timeout(6000) });
    if (!r.ok) return null;
    const d = await r.json();
    return d?.ok ? d : null;
  } catch { return null; }
}

// Each takes live metrics → a <=280 data-backed post. Rotated on data-days.
export const DATA_POSTS = [
  (m) => `GL1TCH has now scanned ${n(m.scans.total)} tokens and mapped ${n(m.signalGraph.deployers)} deployers into the Signal Graph.

A scanner with memory — the moat compounds with every scan. This is what "real product" looks like.

${SITE}/scan`,
  (m) => `${n(m.signalGraph.deployers)} deployers tracked and counting.

Every token GL1TCH scans is remembered against the wallet that shipped it — so a repeat rugger is flagged on its NEXT launch. No other scanner can do this.

${SITE}/agents`,
  (m) => `Not vaporware. Real numbers:

🔍 ${n(m.scans.total)} tokens scanned
🧠 ${n(m.signalGraph.deployers)} deployers mapped
⚠ ${n(m.scans.flagged)} rugs flagged

A memecoin with a used product + a data moat. Judge the product.

${SITE}/thesis`,
  (m) => `The Signal Graph just crossed ${n(m.signalGraph.deployers)} deployers.

The more it's used, the smarter it gets at catching repeat ruggers. A network effect on rug detection — that's the moat.

${SITE}/scan`,
  (m) => `${n(m.scans.total)}+ scans in. Free, non-custodial, any chain.

Every one feeds the Signal Graph + the agent-trust reputation layer. Usage compounds into a moat competitors can't copy.

${SITE}/agents`,
];

/** Pick a data post for the day (deterministic). Returns null if metrics unavailable. */
export function dataPostForDay(metrics, date = new Date()) {
  if (!metrics?.scans || !metrics?.signalGraph) return null;
  const dayNum = Math.floor(Date.parse(date.toISOString().slice(0, 10)) / 86400000);
  const fn = DATA_POSTS[((dayNum % DATA_POSTS.length) + DATA_POSTS.length) % DATA_POSTS.length];
  try { return fn(metrics); } catch { return null; }
}

/** Every 3rd day is a data-proof day (blends feature variety with credibility). */
export function isDataDay(date = new Date()) {
  const dayNum = Math.floor(Date.parse(date.toISOString().slice(0, 10)) / 86400000);
  return dayNum % 3 === 2;
}

/** Thread for the day (rotates), used on thread days. */
export function threadForDay(date = new Date()) {
  const dayNum = Math.floor(Date.parse(date.toISOString().slice(0, 10)) / 86400000);
  return THREADS[((dayNum % THREADS.length) + THREADS.length) % THREADS.length];
}

/** True on thread days (Mon & Thu) — a thread instead of a single post, for reach. */
export function isThreadDay(date = new Date()) {
  const dow = new Date(date.toISOString().slice(0, 10)).getUTCDay(); // 0 Sun … 6 Sat
  return dow === 1 || dow === 4;
}
