// Helpful-reply engine for $GL1TCH — finds people ASKING about token safety / rugs and
// replies with the free scanner. Genuinely useful (not shilling) = high conversion, low
// ban risk. Heavily rate-limited and de-duped to protect the account.
//   NODE_OPTIONS=--use-system-ca LAUNCH_CHROMIUM=1 node e2e/social/x-reply.mjs
// Env: MAX (replies this run, default 3) · DRY=1 (find but don't reply) · HANDLES="a,b" (also
//      check these accounts' latest tweets) · MIN_DAYS_PER_USER (default 7).
import { openX, replyTo, searchLatest, followerCount, store } from "./x-lib.mjs";
import { generateReply } from "./x-llm.mjs";

const SITE = "coin-three-mu.vercel.app";
const MAX = Number(process.env.MAX || 3);
const MIN_DAYS_PER_USER = Number(process.env.MIN_DAYS_PER_USER || 7);
const MIN_FOLLOWERS = Number(process.env.MIN_FOLLOWERS || 150); // skip pure-spam tiny accounts, keep real retail
const DAY = 86400000;

// Intent searches — people actively evaluating a token (buying-intent = potential users).
// min_faves is a cheap engagement floor — skips dead/no-reach accounts before we even look.
const QUERIES = [
  `("is this a rug" OR "is this a scam" OR "is this safe") (solana OR token OR memecoin) -is:retweet lang:en min_faves:3`,
  `("honeypot" OR "can't sell") (solana OR token) -is:retweet lang:en min_faves:3`,
  `("is it safe to buy" OR "how do i know if" rug) -is:retweet lang:en min_faves:2`,
  `("just got rugged" OR "another rug") solana -is:retweet lang:en min_faves:2`,
];

// Broad safety-relevance funnel (the LLM makes the final relevance + quality call via SKIP).
const ASKING = /\b(rug|rugged|rug ?pull|scam|scammed|honeypot|can'?t sell|is (this|it) (safe|legit|a rug|a scam)|safe to (buy|ape)|should i (buy|ape)|got (rugged|scammed)|is it legit|looks like a rug|smells like a rug)\b/i;
// Skip promos, ads, competitor/bot pitches, giveaways, and other people's shilling — these
// aren't questions and replying reads as spam.
const PROMO = /\b(add @|@\w+bot|our (bot|community|tool|platform)|join (our|the)|launch(ing|ed)?|presale|giveaway|airdrop|whitelist|\bWL\b|dm me|link in bio|use code|referral|sign ?up|👇)\b/i;
const isQuestion = (t) => t.includes("?");
const mentionCount = (t) => (t.match(/@\w+/g) || []).length;
// A real person asking uses first-person ("my wallet", "should I"). Projects/marketing quote
// safety phrases in the third person ("your community", "every agent framework") — filter those out.
const FIRST_PERSON = /\b(i|i'm|i've|i'd|my|me|myself)\b/i;
// Marketing/product-pitch tells (even when phrased as a question).
const PITCH = /\b(your community|every (agent|project)|framework|drop[- ]?in|our (users|holders)|for (builders|teams|projects)|API|SDK|integrat)/i;

// High-reach accounts whose comment sections are packed with crypto buyers/degens. We reply ONLY
// where our safety scanner is genuinely on-topic (the LLM SKIPs anything off-topic), so it reads
// as value — not spam. Security accounts are the best fit: their rug/hack alerts are exactly what
// our scanner checks. Aggregators + Solana ecosystem reach real buyers. Env TARGETS extends this.
const TARGET_ACCOUNTS = [
  // security / rug + hack alerts (best fit — scanner is the natural reply)
  "CertiK", "PeckShieldAlert", "zachxbt", "GoPlusSecurity", "RugDocIO", "TokenSniffer", "ScamSniffer", "SlowMist_Team", "spotonchain", "lookonchain",
  // market data / aggregators (new listings, trending, "how to spot a scam")
  "CoinMarketCap", "coingecko", "DexScreener", "GeckoTerminal", "birdeye_so", "dextools", "DefiLlama",
  // Solana ecosystem (our chain — fresh mints + memecoin degens)
  "solana", "JupiterExchange", "pumpdotfun", "heliuslabs", "solscanofficial", "RaydiumProtocol", "bonk_inu",
  // breaking news (rug/hack headlines → scanner reply)
  "WatcherGuru", "Cointelegraph", "TheBlock__",
];
// Topic a target-account post must touch for our scanner to be a genuine, on-topic reply.
const TARGET_TOPIC = /\b(rug|rug ?pull|scam|scammer|honeypot|exploit|hack(ed|er)?|drain(ed|er)?|phish|stolen|malicious|approval|rev(oke|oked)|is it safe|safe to (buy|ape)|how to spot|new (token|listing|coin)|just launched|memecoin|pump\.?fun|freeze authority|mint authority)\b/i;

// Helpful reply variants (no cashtag shilling — offer the free tool). Picked by tweet id.
const REPLIES = [
  `You can check that in ~10s, free, any chain: ${SITE}/scan\n\nIt reads mint/freeze authority, LP lock, holder concentration + the deployer's track record. Not financial advice — just the on-chain facts.`,
  `Free safety read before you ape: ${SITE}/scan\n\nIt flags honeypot/sell traps, insider bundling, and whether the dev can still mint or freeze. Paste the contract, get a plain-English verdict.`,
  `If it's a honeypot, this catches it: ${SITE}/scan simulates the sell side + checks transfer traps. Free, non-custodial (it never touches your wallet). DYOR.`,
  `Quick free check: ${SITE}/scan\n\nMint authority, freeze authority, LP lock, top-holder %, deployer history — in one plain-English score. Any chain.`,
];

const st = store("x-reply-state.json");
const state = st.read();
state.replied = state.replied || {}; // tweetId -> ts
state.users = state.users || {};     // user -> last-reply ts
const now = Date.now();

// prune very old records (>90d)
for (const [k, ts] of Object.entries(state.replied)) if (now - ts > 90 * DAY) delete state.replied[k];

function pickReply(id) { return REPLIES[Number(BigInt(id) % BigInt(REPLIES.length))]; }
function eligible(t) {
  if (!t.text) return false;
  if (!ASKING.test(t.text)) return false;           // safety-relevant (rug/scam/honeypot/…)
  if (PROMO.test(t.text)) return false;             // not a promo/ad/shill
  if (PITCH.test(t.text)) return false;             // not a product/marketing pitch
  if (!FIRST_PERSON.test(t.text)) return false;     // a real person (not 3rd-person marketing)
  if (mentionCount(t.text) > 2) return false;       // mass-tag = spam/promo
  if (t.text.length < 20) return false;             // too thin
  // The LLM (generateReply) is the final relevance + quality judge → returns SKIP if unfit.
  if (state.replied[t.id]) return false;
  if (/gl1tch/i.test(t.text) || t.user.toLowerCase() === "gl1tchbased") return false; // not us
  const last = state.users[t.user];
  if (last && now - last < MIN_DAYS_PER_USER * DAY) return false; // don't pester one user
  return true;
}

// Eligibility for a big TARGET-account post: relax the first-person/question rule (news accounts
// post in the third person) but require a safety/degen-relevant TOPIC. The LLM SKIP gate is still
// the final relevance + quality judge, so off-topic posts never get a reply.
function eligibleTarget(t) {
  if (!t.text) return false;
  if (!TARGET_TOPIC.test(t.text)) return false;
  if (t.text.length < 20) return false;
  if (state.replied[t.id]) return false;
  if (/gl1tch/i.test(t.text) || t.user.toLowerCase() === "gl1tchbased") return false;
  const last = state.users[t.user];
  if (last && now - last < MIN_DAYS_PER_USER * DAY) return false; // don't pester one account
  return true;
}

// Target accounts: the curated high-reach list + any from env TARGETS/HANDLES. We rotate a small
// batch per run (env TARGET_BATCH, default 8) so each run stays fast and X search isn't hammered —
// over successive runs the whole list gets covered.
const envTargets = (process.env.TARGETS || process.env.HANDLES || "").split(",").map((s) => s.trim().replace(/^@/, "")).filter(Boolean);
const allTargets = [...new Set([...TARGET_ACCOUNTS, ...envTargets])];
const TARGET_BATCH = Math.max(1, Number(process.env.TARGET_BATCH) || 8);
const rot = (state.targetRot || 0) % Math.max(1, allTargets.length);
state.targetRot = (rot + TARGET_BATCH) % Math.max(1, allTargets.length);
st.write(state); // persist the rotation immediately so every run advances, even with no reply
const targets = [...allTargets.slice(rot), ...allTargets.slice(0, rot)].slice(0, TARGET_BATCH);

const { context, page } = await openX();
let posted = 0;
try {
  // 1) intent searches — real people asking if a token is safe (buying-intent = potential users)
  const cands = [];
  for (const q of QUERIES) {
    if (cands.length > 40) break;
    cands.push(...(await searchLatest(page, q, 12)));
    await page.waitForTimeout(1500);
  }
  // 2) TARGET accounts — reply in the high-reach comment sections of CMC/CoinGecko/Solana/security
  //    accounts, on their safety-relevant posts, where our scanner is a genuine value-add.
  const targetCands = [];
  for (const h of targets) {
    if (targetCands.length > 80) break;
    const found = await searchLatest(page, `from:${h} (rug OR scam OR hack OR exploit OR honeypot OR drained OR "is it safe" OR "how to spot" OR "new token" OR memecoin OR launch OR listing)`, 6);
    for (const t of found) t.target = true;
    targetCands.push(...found);
    await page.waitForTimeout(1200);
  }

  // Relevance score: prefer on-topic rug/honeypot asks; de-prioritise tweets tagging mega
  // accounts (more scrutiny, less likely a peer conversation).
  const score = (t) => {
    let s = 0;
    if (t.target) s += 3; // prioritise high-reach target-account comment sections
    if (/\b(rug|honeypot|scam|hack|exploit|drain)\b/i.test(t.text)) s += 2;
    if (/\b(buy|ape|invest)\b/i.test(t.text)) s += 1;
    if (t.text.length < 200) s += 1;
    return s;
  };
  const queue = [...cands.filter(eligible), ...targetCands.filter(eligibleTarget)].sort((a, b) => score(b) - score(a));
  console.log(`[x-reply] ${cands.length} candidates · ${queue.length} eligible · posting up to ${MAX}`);

  let checked = 0;
  for (const t of queue) {
    if (posted >= MAX || checked > MAX * 5) break;
    checked++;
    // Follower gate — only reply to accounts with real reach (not ~100-follower accounts).
    const fc = await followerCount(page, t.user).catch(() => null);
    if (fc != null && fc < MIN_FOLLOWERS) { console.log(`  ↳ skip @${t.user} (${fc} followers < ${MIN_FOLLOWERS})`); continue; }
    // Contextual LLM reply is the hard quality+relevance gate: null = SKIP (or LLM down) →
    // don't reply at all (a template to a borderline target reads as spam). Quality over volume.
    const text = await generateReply(t.text).catch(() => null);
    if (!text) { console.log(`  ↳ skip @${t.user} (LLM: not a good fit)`); continue; }
    console.log(`\n→ @${t.user} (${fc ?? "?"} followers): ${t.text.slice(0, 80).replace(/\n/g, " ")}…`);
    console.log(`  reply: ${text.slice(0, 90).replace(/\n/g, " ")}…`);
    if (process.env.DRY === "1") { console.log("  [DRY] not posting"); posted++; continue; }
    const ok = await replyTo(page, t.url, text).catch(() => false);
    if (ok) {
      state.replied[t.id] = now; state.users[t.user] = now; st.write(state);
      posted++;
      console.log(`  ✅ replied (${posted}/${MAX})`);
      await page.waitForTimeout(20000 + Math.floor(Number(BigInt(t.id) % 20000n))); // natural, varied gap
    } else {
      console.log("  ⚠️ reply failed (skipped)");
    }
  }
} finally {
  console.log(`\n[x-reply] done — ${posted} ${process.env.DRY === "1" ? "candidates (dry)" : "replies posted"}`);
  await page.waitForTimeout(1500);
  await context.close();
}
