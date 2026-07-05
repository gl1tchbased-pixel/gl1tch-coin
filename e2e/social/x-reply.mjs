// Helpful-reply engine for $GL1TCH — finds people ASKING about token safety / rugs and
// replies with the free scanner. Genuinely useful (not shilling) = high conversion, low
// ban risk. Heavily rate-limited and de-duped to protect the account.
//   NODE_OPTIONS=--use-system-ca LAUNCH_CHROMIUM=1 node e2e/social/x-reply.mjs
// Env: MAX (replies this run, default 3) · DRY=1 (find but don't reply) · HANDLES="a,b" (also
//      check these accounts' latest tweets) · MIN_DAYS_PER_USER (default 7).
import { openX, replyTo, searchLatest, store } from "./x-lib.mjs";

const SITE = "coin-three-mu.vercel.app";
const MAX = Number(process.env.MAX || 3);
const MIN_DAYS_PER_USER = Number(process.env.MIN_DAYS_PER_USER || 7);
const DAY = 86400000;

// Intent searches — people actively evaluating a token (buying-intent = potential users).
const QUERIES = [
  `("is this a rug" OR "is this a scam" OR "is this safe") (solana OR token OR memecoin) -is:retweet lang:en`,
  `("honeypot" OR "can't sell") (solana OR token) -is:retweet lang:en`,
  `("is it safe to buy" OR "how do i know if" rug) -is:retweet lang:en`,
  `("just got rugged" OR "another rug") solana -is:retweet lang:en`,
];

// Reply only to genuine questions: a real safety ask AND a question mark.
const ASKING = /is (this|it) (a )?(safe|rug|scam|legit|honeypot)|how (do|can) i (check|know|tell)|is it safe to (buy|ape)|should i (buy|ape)|rug(ged)?\??$|honeypot/i;
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
  if (!isQuestion(t.text)) return false;            // must be an actual question
  if (!ASKING.test(t.text)) return false;           // ...about safety/rugs
  if (PROMO.test(t.text)) return false;             // not a promo/ad/shill
  if (PITCH.test(t.text)) return false;             // not a product/marketing pitch
  if (!FIRST_PERSON.test(t.text)) return false;     // a real person asking (not 3rd-person marketing)
  if (mentionCount(t.text) > 2) return false;       // mass-tag = spam/promo
  if (t.text.length < 25) return false;             // too thin to be a real ask
  if (state.replied[t.id]) return false;
  if (/gl1tch/i.test(t.text) || t.user.toLowerCase() === "gl1tchbased") return false; // not us
  const last = state.users[t.user];
  if (last && now - last < MIN_DAYS_PER_USER * DAY) return false; // don't pester one user
  return true;
}

const extraHandles = (process.env.HANDLES || "").split(",").map((s) => s.trim().replace(/^@/, "")).filter(Boolean);

const { context, page } = await openX();
let posted = 0;
try {
  // gather candidates from searches (+ optional specific handles)
  const cands = [];
  for (const q of QUERIES) {
    if (cands.length > 40) break;
    cands.push(...(await searchLatest(page, q, 12)));
    await page.waitForTimeout(1500);
  }
  for (const h of extraHandles) {
    cands.push(...(await searchLatest(page, `from:${h} (rug OR scam OR safe OR honeypot OR token)`, 5)));
    await page.waitForTimeout(1500);
  }

  // Relevance score: prefer on-topic rug/honeypot asks; de-prioritise tweets tagging mega
  // accounts (more scrutiny, less likely a peer conversation).
  const score = (t) => {
    let s = 0;
    if (/\b(rug|honeypot|scam)\b/i.test(t.text)) s += 2;
    if (/\b(buy|ape|invest)\b/i.test(t.text)) s += 1;
    if (t.text.length < 200) s += 1;
    if (/@(solana|ledger|binance|coinbase|elonmusk|cz_binance)\b/i.test(t.text)) s -= 3;
    return s;
  };
  const queue = cands.filter(eligible).sort((a, b) => score(b) - score(a));
  console.log(`[x-reply] ${cands.length} candidates · ${queue.length} eligible · posting up to ${MAX}`);

  for (const t of queue) {
    if (posted >= MAX) break;
    const text = pickReply(t.id);
    console.log(`\n→ @${t.user}: ${t.text.slice(0, 90).replace(/\n/g, " ")}…`);
    if (process.env.DRY === "1") { console.log(`  [DRY] would reply: ${text.slice(0, 70)}…`); posted++; continue; }
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
