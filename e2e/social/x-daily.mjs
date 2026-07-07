// Daily $GL1TCH X post — picks today's curated post and publishes it via Playwright.
// Idempotent: won't post twice the same day (tracked in out/x-daily-state.json).
//   NODE_OPTIONS=--use-system-ca LAUNCH_CHROMIUM=1 node e2e/social/x-daily.mjs
// FORCE=1 to post again the same day; DRY=1 to preview without posting.
import { openX, postThread, store } from "./x-lib.mjs";
import { postForDay, threadForDay, isThreadDay, fetchMetrics, dataPostForDay, isDataDay } from "./x-content.mjs";

const today = new Date().toISOString().slice(0, 10);
const st = store("x-daily-state.json");
const state = st.read();

if (state.lastDate === today && process.env.FORCE !== "1") {
  console.log(`[x-daily] already posted today (${today}) — skip (FORCE=1 to override)`);
  process.exit(0);
}

// Threads (higher reach) on thread days; data-proof posts (live metrics) every 3rd day;
// feature-rotation posts otherwise. THREAD=1/0 and DATA=1 to force.
const wantThread = process.env.THREAD === "1" || (process.env.THREAD !== "0" && isThreadDay());
let payload;
if (wantThread) {
  payload = threadForDay();
} else if (process.env.DATA === "1" || isDataDay()) {
  const metrics = await fetchMetrics();
  payload = dataPostForDay(metrics) || postForDay(); // fall back to a feature post if metrics are down
  if (dataPostForDay(metrics)) console.log("[x-daily] data-proof day (live metrics)");
} else {
  payload = postForDay();
}
const preview = Array.isArray(payload) ? payload.join("\n— — —\n") : payload;
console.log(`[x-daily] today's ${Array.isArray(payload) ? `THREAD (${payload.length} tweets)` : "post"}:\n---\n${preview}\n---`);

if (process.env.DRY === "1") { console.log("[x-daily] DRY run — not posting"); process.exit(0); }

const { context, page } = await openX();
let ok = false;
try {
  ok = await postThread(page, payload);
} finally {
  if (ok) { state.lastDate = today; state.lastText = preview.slice(0, 200); st.write(state); }
  console.log(ok ? "[x-daily] ✅ posted" : "[x-daily] ⚠️ could not confirm — see out/x-compose.png");
  await page.waitForTimeout(1500);
  await context.close();
}
