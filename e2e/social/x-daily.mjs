// Daily $GL1TCH X post — picks today's curated post and publishes it via Playwright.
// Idempotent: won't post twice the same day (tracked in out/x-daily-state.json).
//   NODE_OPTIONS=--use-system-ca LAUNCH_CHROMIUM=1 node e2e/social/x-daily.mjs
// FORCE=1 to post again the same day; DRY=1 to preview without posting.
import { openX, postThread, store } from "./x-lib.mjs";
import { postForDay } from "./x-content.mjs";

const today = new Date().toISOString().slice(0, 10);
const st = store("x-daily-state.json");
const state = st.read();

if (state.lastDate === today && process.env.FORCE !== "1") {
  console.log(`[x-daily] already posted today (${today}) — skip (FORCE=1 to override)`);
  process.exit(0);
}

const text = postForDay();
console.log("[x-daily] today's post:\n---\n" + text + "\n---");

if (process.env.DRY === "1") { console.log("[x-daily] DRY run — not posting"); process.exit(0); }

const { context, page } = await openX();
let ok = false;
try {
  ok = await postThread(page, text);
} finally {
  if (ok) { state.lastDate = today; state.lastText = text; st.write(state); }
  console.log(ok ? "[x-daily] ✅ posted" : "[x-daily] ⚠️ could not confirm — see out/x-compose.png");
  await page.waitForTimeout(1500);
  await context.close();
}
