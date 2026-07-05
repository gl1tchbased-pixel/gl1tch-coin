// Topical news-jacking — quote-tweets a big crypto rug/hack/scam story with a sharp GL1TCH
// take (LLM). High-engagement news only (min_faves), quoted (our take + the tweet URL → X
// renders a quote-tweet), deduped, MAX 1/run. Sparingly — this is a reach play, not spam.
//   NODE_OPTIONS=--use-system-ca LAUNCH_CHROMIUM=1 node e2e/social/x-newsjack.mjs
// Env: MAX (default 1) · MIN_FAVES (default 150) · DRY=1.
import { openX, postThread, searchLatest, store } from "./x-lib.mjs";
import { generateTake } from "./x-llm.mjs";

const SITE = "coin-three-mu.vercel.app";
const MAX = Number(process.env.MAX || 1);
const MIN_FAVES = Number(process.env.MIN_FAVES || 150);

// Only genuinely big, relevant safety news — where our angle is credible and timely.
const QUERIES = [
  `("rug pull" OR "rugged" OR "exit scam") (solana OR token OR memecoin) -is:retweet lang:en min_faves:${MIN_FAVES}`,
  `("wallet drained" OR "got drained" OR "drainer") crypto -is:retweet lang:en min_faves:${MIN_FAVES}`,
  `("honeypot" OR "can't sell") (scam OR token) -is:retweet lang:en min_faves:${MIN_FAVES}`,
];
// Must actually be about a scam/rug/hack event (not a generic mention).
const RELEVANT = /\b(rug|rugged|rug pull|exit scam|drain(ed|er)?|honeypot|scam|stole|stolen|hack(ed)?|\$[\d.]+\s*(k|m|million|b))\b/i;

const st = store("x-newsjack-state.json");
const state = st.read();
state.jacked = state.jacked || {}; // tweetId -> ts
const now = Date.now();
const today = new Date().toISOString().slice(0, 10);

// At most one quote-tweet per day (quoting big accounts too often reads as farming).
if (state.lastDate === today && process.env.FORCE !== "1") {
  console.log(`[x-newsjack] already quote-tweeted today (${today}) — skip`);
  process.exit(0);
}

const { context, page } = await openX();
let posted = 0;
try {
  const cands = [];
  for (const q of QUERIES) {
    cands.push(...(await searchLatest(page, q, 10)));
    await page.waitForTimeout(1500);
  }
  const queue = cands.filter(
    (t) => t.text && RELEVANT.test(t.text) && !state.jacked[t.id] && !/gl1tch/i.test(t.text) && t.user.toLowerCase() !== "gl1tchbased"
  );
  console.log(`[x-newsjack] ${cands.length} candidates · ${queue.length} eligible (min_faves:${MIN_FAVES})`);

  for (const t of queue) {
    if (posted >= MAX) break;
    const take = await generateTake(t.text).catch(() => null);
    if (!take) { console.log("  (no take generated, skipping)"); continue; }
    // Quote tweet = our take + the target tweet URL (X embeds it) + our link.
    const text = `${take}\n\n${SITE}/scan\n${t.url}`;
    console.log(`\n→ quoting @${t.user}: ${t.text.slice(0, 70).replace(/\n/g, " ")}…`);
    console.log(`  take: ${take}`);
    if (process.env.DRY === "1") { console.log("  [DRY] not posting"); posted++; continue; }
    const ok = await postThread(page, text).catch(() => false);
    if (ok) { state.jacked[t.id] = now; state.lastDate = today; st.write(state); posted++; console.log("  ✅ posted"); }
    else console.log("  ⚠️ post failed");
    await page.waitForTimeout(5000);
  }
} finally {
  console.log(`[x-newsjack] done — ${posted} ${process.env.DRY === "1" ? "candidates (dry)" : "quote-tweet(s)"}`);
  await page.waitForTimeout(1500);
  await context.close();
}
