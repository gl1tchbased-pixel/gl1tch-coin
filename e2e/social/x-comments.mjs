// Answers people who comment on or mention @gl1tchbased. Unlike x-reply.mjs, which looks for strangers,
// these people came to us, so this is the safest place to be automated and the most useful one to be quick.
//   NODE_OPTIONS=--use-system-ca LAUNCH_CHROMIUM=1 node e2e/social/x-comments.mjs
// Env: MAX (replies this run, default 5) · DRY=1 (write but don't post) · MAX_AGE_DAYS (default 7) ·
//      MIN_HOURS_PER_USER (default 6).
import { openX, replyTo, searchLatest, store } from "./x-lib.mjs";
import { generateCommentReply } from "./x-llm.mjs";

const ME = "gl1tchbased";
const SITE = "https://gl1tchbased.xyz";
const CONTRACT = "3HQJwwHvzy8pGkPqGQcb4thZCH88MUCHVVSNtHn6pump";
const MAX = Number(process.env.MAX || 5);
const MAX_AGE_DAYS = Number(process.env.MAX_AGE_DAYS || 7);
const MIN_HOURS_PER_USER = Number(process.env.MIN_HOURS_PER_USER || 6);
const DAY = 86_400_000;
const DRY = process.env.DRY === "1";

// X ids carry their creation time, so a comment's age needs no extra page visit.
const tweetTime = (id) => Number(BigInt(id) >> 22n) + 1288834974657;
const ADDRESS = /\b(?:0x[0-9a-fA-F]{40}|[1-9A-HJ-NP-Za-km-z]{32,44})\b/;

const st = store("x-comments-state.json");
const state = st.read();
state.seen = state.seen || {}; // tweetId -> ts: answered or passed on, so neither is looked at twice
state.users = state.users || {}; // user -> last reply ts
const now = Date.now();
for (const [id, ts] of Object.entries(state.seen)) if (now - ts > 90 * DAY) delete state.seen[id];

/** One line about a token someone pasted, or about ours: the reply is held to what this says. */
async function scanFacts(address) {
  try {
    const r = await fetch(`${SITE}/api/scan?mint=${address}`, { headers: { "x-gl1tch-source": "bot" }, signal: AbortSignal.timeout(30_000) });
    const d = await r.json();
    if (!d?.verdict) return null;
    return `${d.symbol || d.name || "token"} (${address}) on our scanner: ${d.verdict}, ${d.score}/100. ${d.bottomLine || ""} Report: ${SITE}/scan/${d.chain}-${d.mint}`;
  } catch {
    return null;
  }
}

const { context, page } = await openX();
let posted = 0;
try {
  const found = [
    ...(await searchLatest(page, `to:${ME} -from:${ME}`, 20)),
    ...(await searchLatest(page, `@${ME} -from:${ME}`, 20)),
  ];
  const queue = [...new Map(found.map((t) => [t.id, t])).values()]
    .filter((t) => t.text && t.user.toLowerCase() !== ME)
    .filter((t) => !state.seen[t.id] && now - tweetTime(t.id) < MAX_AGE_DAYS * DAY)
    .sort((a, b) => tweetTime(a.id) - tweetTime(b.id)); // oldest first: they've waited longest
  console.log(`[x-comments] ${found.length} found · ${queue.length} new · posting up to ${MAX}`);

  const selfScan = queue.length ? await scanFacts(CONTRACT) : null;
  for (const t of queue) {
    if (posted >= MAX) break;
    const last = state.users[t.user];
    if (last && now - last < MIN_HOURS_PER_USER * 3_600_000) continue; // left unseen: it's picked up next run

    const pasted = t.text.match(ADDRESS)?.[0];
    const facts = [selfScan, pasted && pasted !== CONTRACT ? await scanFacts(pasted) : null].filter(Boolean).join("\n");
    const text = await generateCommentReply(t.text, facts).catch(() => null);
    console.log(`\n→ @${t.user}: ${t.text.slice(0, 100).replace(/\n/g, " ")}`);
    if (text === undefined) {
      console.log("  ↳ LLM unavailable, will retry next run"); // not marked seen
      continue;
    }
    if (!text) {
      console.log("  ↳ passed");
      if (!DRY) { state.seen[t.id] = now; st.write(state); }
      continue;
    }
    console.log(`  reply: ${text.replace(/\n/g, " ")}`);
    if (DRY) { posted++; continue; }

    const ok = await replyTo(page, t.url, text).catch(() => false);
    if (!ok) { console.log("  ⚠️ reply failed, will retry next run"); continue; }
    state.seen[t.id] = now;
    state.users[t.user] = now;
    st.write(state);
    posted++;
    console.log(`  ✅ replied (${posted}/${MAX})`);
    await page.waitForTimeout(30_000 + Math.floor(Math.random() * 30_000));
  }
} finally {
  console.log(`\n[x-comments] done · ${posted} ${DRY ? "drafted (dry)" : "replies posted"}`);
  await page.waitForTimeout(1500);
  await context.close();
}
