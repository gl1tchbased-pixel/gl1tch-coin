// X (Twitter) thread poster — Playwright, human-in-the-loop login.
// The X API write tier is paywalled (402 no-credits), so we drive the web composer:
// log in once in the window → type the thread → attach the video to tweet 1 → post all.
//   NODE_OPTIONS=--use-system-ca LAUNCH_CHROMIUM=1 node e2e/social/x-post.mjs
// Reads the 6 tweets from pump-pack/15 and attaches the Signal Graph reel to the cover.
import path from "node:path";
import fs from "node:fs";
import { launch, waitForLogin, shot, REPO, OUT } from "./lib/launch.mjs";

// Override with POST_FILE (md in pump-pack/) + VIDEO (basename in pump-pack/videos/branded/).
const VIDEO = path.resolve(REPO, "pump-pack", "videos", "branded", process.env.VIDEO || "gl1tch-signal-graph.mp4");
const MD = path.resolve(REPO, "pump-pack", process.env.POST_FILE || "15-premium-features-announce.md");

const md = fs.readFileSync(MD, "utf8");
const tweets = [...md.split("## TELEGRAM")[0].matchAll(/```\n([\s\S]*?)```/g)].map((m) => m[1].replace(/\n$/, ""));
if (tweets.length < 2) { console.error("[x] could not parse thread"); process.exit(2); }
const attachVideo = process.env.NO_VIDEO !== "1" && fs.existsSync(VIDEO);
console.log(`[x] ${tweets.length} tweets parsed · video=${attachVideo ? "yes" : "no"}`);

const { context, page } = await launch("x");

await page.goto("https://x.com/home", { waitUntil: "domcontentloaded" }).catch(() => {});
await page.waitForTimeout(3000);

// Logged in when the compose ("post") button in the left nav exists.
const loggedIn = async (p) =>
  (await p.locator('[data-testid="SideNav_NewTweet_Button"], a[href="/compose/post"]').count()) > 0;
if (!(await waitForLogin(page, loggedIn, "X"))) { console.error("[x] login timed out"); await context.close(); process.exit(1); }

// Open the composer.
await page.goto("https://x.com/compose/post", { waitUntil: "domcontentloaded" }).catch(() => {});
await page.waitForTimeout(2500);

async function typeInto(idx, text) {
  const box = page.locator(`[data-testid="tweetTextarea_${idx}"]`).first();
  await box.click({ timeout: 15000 });
  await page.keyboard.insertText(text);
  await page.waitForTimeout(600);
}

// Tweet 1 (cover) + video.
await typeInto(0, tweets[0]);
if (attachVideo) {
  console.log("[x] attaching video…");
  const fileInput = page.locator('[data-testid="fileInput"], input[type="file"]').first();
  await fileInput.setInputFiles(VIDEO);
  // Wait for the media to finish processing: the progress bar disappears / preview settles.
  for (let i = 0; i < 80; i++) {
    await page.waitForTimeout(3000);
    const progress = await page.locator('[role="progressbar"], [data-testid="progressBar"]').count().catch(() => 0);
    const preview = await page.locator('[data-testid="attachments"], video, [aria-label*="Media"]').count().catch(() => 0);
    if (preview > 0 && progress === 0) { console.log(`[x] media ready (${i * 3}s)`); break; }
    if (i % 5 === 0) console.log(`[x] processing media… (${i * 3}s)`);
  }
}

// Add the rest of the thread via the "add post" button.
for (let i = 1; i < tweets.length; i++) {
  await page.locator('[data-testid="addButton"]').first().click({ timeout: 10000 }).catch(() => console.log(`[x] add-button missed before tweet ${i + 1}`));
  await page.waitForTimeout(900);
  await typeInto(i, tweets[i]).catch((e) => console.log(`[x] type tweet ${i + 1} failed: ${e.message}`));
}

await shot(page, "x-1-composed.png");

// Post everything: "Post all" (thread) or "Post".
const postBtn = page.locator('[data-testid="tweetButton"]').first();
await postBtn.click({ timeout: 15000 }).catch(async () => {
  await page.getByRole("button", { name: /^Post all$|^Post$|^Gönder$|^Tümünü gönder$/i }).first().click({ timeout: 10000 }).catch(() => console.log("[x] post button missed"));
});

// Reliable confirm: the composer's first textarea detaches on send, OR a "posts were sent"
// toast appears (the count heuristic false-negatived — the post lands but reads UNCONFIRMED).
const posted = await page
  .waitForSelector('[data-testid="tweetTextarea_0"]', { state: "detached", timeout: 20000 })
  .then(() => true)
  .catch(() => false);
await shot(page, "x-2-posted.png");
const toast = (await page.getByText(/posts? (were|was) sent|Your post was sent|Gönderildi/i).count().catch(() => 0)) > 0;
const ok = posted || toast;
fs.writeFileSync(path.resolve(OUT, "x-result.txt"), `${ok ? "POSTED" : "UNCONFIRMED"}\n`);
console.log(ok ? "[x] ✅ thread POSTED (verify on @gl1tchbased)" : "[x] ⚠️ could not confirm — see x-2-posted.png");
await page.waitForTimeout(2000);
await context.close();
