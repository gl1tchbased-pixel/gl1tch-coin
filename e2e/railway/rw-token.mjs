// Create a Railway ACCOUNT token via the dashboard (clean Playwright profile, so
// the flookiii25 login isn't contaminated by the iskeletonprime browser session).
// I launch this in the background; YOU just log in as flookiii25 in the window.
// The script polls for login (no Enter needed), then creates + extracts the token
// and writes it to out/rw-token.txt for the deploy step.
//   NODE_OPTIONS=--use-system-ca node e2e/railway/rw-token.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const DIR = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(DIR, "out");
const PROFILE = path.join(DIR, ".profiles", "main");
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(PROFILE, { recursive: true });
const status = (s) => { fs.writeFileSync(path.join(OUT, "rw-status.txt"), s + "\n"); console.log("[rw]", s); };

const ctx = await chromium.launchPersistentContext(PROFILE, {
  headless: false, viewport: { width: 1280, height: 860 }, slowMo: 60,
  args: ["--disable-blink-features=AutomationControlled"],
  channel: "chrome",
}).catch(() => chromium.launchPersistentContext(PROFILE, {
  headless: false, viewport: { width: 1280, height: 860 }, slowMo: 60,
  args: ["--disable-blink-features=AutomationControlled"],
}));
const page = ctx.pages()[0] ?? (await ctx.newPage());
const shot = async (n) => { await page.screenshot({ path: path.join(OUT, `rw-${n}.png`) }).catch(() => {}); };

await page.goto("https://railway.app/account/tokens", { waitUntil: "domcontentloaded" }).catch(() => {});
await page.waitForTimeout(2500);

// Poll up to ~8 min for login to complete (URL leaves the login/auth screens AND
// the tokens page actually renders something interactive).
status("waiting-for-login");
const deadline = Date.now ? null : null; // Date.now is blocked in workflows only; here it's a normal node script
let loggedIn = false;
for (let i = 0; i < 160; i++) { // 160 * 3s = 8 min
  await page.waitForTimeout(3000);
  const url = page.url();
  if (!/login|\/auth|signup/i.test(url)) {
    // make sure we're on the tokens page
    if (!/account\/tokens/i.test(url)) {
      await page.goto("https://railway.app/account/tokens", { waitUntil: "domcontentloaded" }).catch(() => {});
      await page.waitForTimeout(2500);
    }
    const hasUi = await page.evaluate(() =>
      !!document.querySelector('input[type="text"], input[placeholder], button')
      && !/log\s?in|sign\s?in/i.test(document.body.innerText.slice(0, 400))
    ).catch(() => false);
    if (hasUi) { loggedIn = true; break; }
  }
  if (i % 5 === 0) status(`waiting-for-login (${i * 3}s)`);
}
if (!loggedIn) { status("login-timeout — see rw-tokens-page.png"); await shot("tokens-page"); await ctx.close(); process.exit(2); }

status("logged-in — creating token");
await shot("tokens-page");

const dump = await page.evaluate(() => [...document.querySelectorAll('button, input, [role="button"], a')]
  .filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; })
  .map((e) => ({ tag: e.tagName.toLowerCase(), type: e.getAttribute("type") || "", ph: e.getAttribute("placeholder") || "", text: (e.innerText || e.value || "").trim().slice(0, 30) }))
  .filter((e) => e.text || e.ph));
fs.writeFileSync(path.join(OUT, "rw-tokens-dump.json"), JSON.stringify(dump, null, 2));

try {
  const nameInput = page.locator('input[type="text"], input[placeholder*="name" i], input[placeholder*="token" i]').first();
  if (await nameInput.count()) { await nameInput.click().catch(() => {}); await nameInput.fill("GL1TCH deploy"); await page.waitForTimeout(400); }
  const createBtn = page.getByRole("button", { name: /create|generate|new token|add/i }).first();
  if (await createBtn.count()) { await createBtn.click().catch(() => {}); await page.waitForTimeout(2500); }
  await shot("after-create");

  const token = await page.evaluate(() => {
    const cand = [];
    document.querySelectorAll('input, code, textarea, [class*="token" i], [class*="mono" i]').forEach((e) => {
      const v = (e.value || e.textContent || "").trim();
      if (/^[A-Za-z0-9._-]{24,}$/.test(v) && !/gl1tch deploy/i.test(v)) cand.push(v);
    });
    return cand.sort((a, b) => b.length - a.length)[0] || "";
  });
  if (token) {
    fs.writeFileSync(path.join(OUT, "rw-token.txt"), token);
    status(`TOKEN-CAPTURED (${token.length} chars)`);
  } else {
    status("no-token — see rw-after-create.png + rw-tokens-dump.json");
  }
} catch (e) {
  status("create-error: " + (e.message?.split("\n")[0] || ""));
}

// Keep the window open a bit so a manually-revealed token can still be re-read,
// then close cleanly (no terminal interaction needed).
await page.waitForTimeout(60000);
await ctx.close();
process.exit(0);
