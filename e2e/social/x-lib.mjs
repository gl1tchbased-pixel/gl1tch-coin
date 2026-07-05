// Reusable X (Twitter) Playwright primitives — the X API write tier is paywalled (402),
// so everything drives the web composer with a cached login (.profiles/x).
// Used by x-daily.mjs (scheduled posts) and x-reply.mjs (helpful replies).
import path from "node:path";
import fs from "node:fs";
import { launch, waitForLogin, shot, REPO, OUT } from "./lib/launch.mjs";

export { REPO, OUT, shot };

/** Launch the X profile and confirm we're logged in. Returns { context, page }. */
export async function openX() {
  const { context, page } = await launch("x");
  await page.goto("https://x.com/home", { waitUntil: "domcontentloaded" }).catch(() => {});
  await page.waitForTimeout(3000);
  const loggedIn = async (p) =>
    (await p.locator('[data-testid="SideNav_NewTweet_Button"], a[href="/compose/post"]').count()) > 0;
  const ok = await waitForLogin(page, loggedIn, "X");
  if (!ok) { await context.close(); throw new Error("x-login-timeout"); }
  return { context, page };
}

async function typeInto(page, idx, text) {
  const box = page.locator(`[data-testid="tweetTextarea_${idx}"]`).first();
  await box.click({ timeout: 15000 });
  await page.keyboard.insertText(text);
  await page.waitForTimeout(500);
}

async function waitMedia(page, maxS = 240) {
  for (let i = 0; i < Math.ceil(maxS / 3); i++) {
    await page.waitForTimeout(3000);
    const progress = await page.locator('[role="progressbar"], [data-testid="progressBar"]').count().catch(() => 0);
    const preview = await page.locator('[data-testid="attachments"], video').count().catch(() => 0);
    if (preview > 0 && progress === 0) return true;
  }
  return false;
}

async function clickPost(page) {
  const btn = page.locator('[data-testid="tweetButton"]').first();
  await btn.click({ timeout: 15000 }).catch(async () => {
    await page.getByRole("button", { name: /^Post all$|^Post$|^Gönder$|^Tümünü gönder$/i }).first().click({ timeout: 10000 }).catch(() => {});
  });
  // Reliable success = the composer's first textarea detaches (modal/page closes after send),
  // or a confirmation toast appears. Poll up to 20s so slow sends aren't false-negatives.
  const posted = await page
    .waitForSelector('[data-testid="tweetTextarea_0"]', { state: "detached", timeout: 20000 })
    .then(() => true)
    .catch(() => false);
  if (posted) return true;
  await page.waitForTimeout(2000);
  const toast = (await page.getByText(/posts? (were|was) sent|Your post was sent|Gönderildi|View/i).count().catch(() => 0)) > 0;
  return toast;
}

/** Post a single tweet or a thread (array). Optional video attached to the first tweet. */
export async function postThread(page, tweets, opts = {}) {
  const list = Array.isArray(tweets) ? tweets : [tweets];
  await page.goto("https://x.com/compose/post", { waitUntil: "domcontentloaded" }).catch(() => {});
  await page.waitForTimeout(2500);
  await typeInto(page, 0, list[0]);
  if (opts.video && fs.existsSync(opts.video)) {
    await page.locator('[data-testid="fileInput"], input[type="file"]').first().setInputFiles(opts.video);
    await waitMedia(page);
  }
  for (let i = 1; i < list.length; i++) {
    await page.locator('[data-testid="addButton"]').first().click({ timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(800);
    await typeInto(page, i, list[i]);
  }
  await shot(page, "x-compose.png");
  return clickPost(page);
}

/** Reply to a specific tweet URL with `text`. Returns true on apparent success. */
export async function replyTo(page, tweetUrl, text) {
  await page.goto(tweetUrl, { waitUntil: "domcontentloaded" }).catch(() => {});
  await page.waitForTimeout(3000);
  // The reply box is the inline composer under the tweet.
  const reply = page.locator('[data-testid="tweetTextarea_0"]').first();
  await reply.click({ timeout: 15000 });
  await page.keyboard.insertText(text);
  await page.waitForTimeout(600);
  return clickPost(page);
}

/**
 * Search X for `query` (Latest tab) and return up to `n` candidate tweets:
 * { url, user, id, text }. Read-only.
 */
export async function searchLatest(page, query, n = 10) {
  const url = `https://x.com/search?q=${encodeURIComponent(query)}&f=live`;
  await page.goto(url, { waitUntil: "domcontentloaded" }).catch(() => {});
  await page.waitForTimeout(4000);
  const out = [];
  const seen = new Set();
  for (let scroll = 0; scroll < 5 && out.length < n; scroll++) {
    const arts = await page.locator('article[data-testid="tweet"]').all().catch(() => []);
    for (const a of arts) {
      try {
        const link = await a.locator('a[href*="/status/"]').first().getAttribute("href").catch(() => null);
        if (!link) continue;
        const m = link.match(/^\/([^/]+)\/status\/(\d+)/);
        if (!m) continue;
        const id = m[2];
        if (seen.has(id)) continue;
        seen.add(id);
        const text = (await a.locator('[data-testid="tweetText"]').first().innerText().catch(() => "")).trim();
        out.push({ id, user: m[1], url: `https://x.com${link.split("?")[0]}`, text });
        if (out.length >= n) break;
      } catch { /* skip */ }
    }
    await page.mouse.wheel(0, 2400);
    await page.waitForTimeout(2500);
  }
  return out;
}

function parseCount(s) {
  const m = String(s).replace(/,/g, "").match(/([\d.]+)\s*([KMB])?/i);
  if (!m) return null;
  const n = parseFloat(m[1]);
  const mult = { k: 1e3, m: 1e6, b: 1e9 }[(m[2] || "").toLowerCase()] || 1;
  return Math.round(n * mult);
}

/** Follower count for a handle (visits the profile). Null if it can't be read. */
export async function followerCount(page, user) {
  await page.goto(`https://x.com/${user}`, { waitUntil: "domcontentloaded" }).catch(() => {});
  await page.waitForTimeout(2800);
  const link = page.locator(`a[href="/${user}/verified_followers"], a[href="/${user}/followers"]`).first();
  const txt = await link.innerText().catch(() => "");
  // innerText looks like "1,234\nFollowers" or "12.3K Followers"
  const num = txt.split(/\s+/).find((p) => /[\d.,KMB]/i.test(p));
  return parseCount(num || txt);
}

/** Tiny JSON store on disk (replied-tweet ids, last-post date, etc.). */
export function store(name) {
  const file = path.resolve(OUT, name);
  const read = () => { try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return {}; } };
  const write = (o) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(o, null, 2)); };
  return { read, write, file };
}
