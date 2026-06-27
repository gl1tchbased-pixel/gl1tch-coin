// Create a GitHub Personal Access Token via the web UI (clean Playwright profile).
// You log in as gl1tch@gmail.com in the window; the script lands on the token page
// (repo+workflow scopes prefilled), generates the token, and writes it to
// out/gh-token.txt (+ your username) for the push step.
//   NODE_OPTIONS=--use-system-ca node e2e/github/gh-pat.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const DIR = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(DIR, "out");
const PROFILE = path.join(DIR, ".profiles", "main");
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(PROFILE, { recursive: true });
const status = (s) => { fs.writeFileSync(path.join(OUT, "gh-status.txt"), s + "\n"); console.log("[gh]", s); };
for (const lock of ["SingletonLock", "SingletonCookie", "SingletonSocket"]) { try { fs.rmSync(path.join(PROFILE, lock), { force: true }); } catch { /* */ } }

const TOKEN_URL = "https://github.com/settings/tokens/new?scopes=repo,workflow&description=GL1TCH%20deploy";

const ctx = await chromium.launchPersistentContext(PROFILE, {
  headless: false, viewport: null, slowMo: 70,
  args: ["--disable-blink-features=AutomationControlled", "--start-maximized"],
  channel: "chrome",
}).catch(() => chromium.launchPersistentContext(PROFILE, {
  headless: false, viewport: null, slowMo: 70,
  args: ["--disable-blink-features=AutomationControlled", "--start-maximized"],
}));
const page = ctx.pages()[0] ?? (await ctx.newPage());
await page.bringToFront().catch(() => {});
const shot = (n) => page.screenshot({ path: path.join(OUT, `gh-${n}.png`) }).catch(() => {});

await page.goto(TOKEN_URL, { waitUntil: "domcontentloaded" }).catch(() => {});
await page.waitForTimeout(2500);

// Wait until logged in AND on the new-token form (login redirects here via return_to).
status("waiting-for-login");
let ok = false;
for (let i = 0; i < 200; i++) { // ~10 min
  const url = page.url();
  const loggedIn = await page.locator('meta[name="user-login"]').count().then((c) => c > 0).catch(() => false);
  if (loggedIn && !/\/(login|session)/.test(url)) {
    if (!/settings\/tokens\/new/.test(url)) { await page.goto(TOKEN_URL, { waitUntil: "domcontentloaded" }).catch(() => {}); await page.waitForTimeout(2000); }
    if (await page.getByRole("button", { name: /Generate token/i }).count()) { ok = true; break; }
  }
  if (i % 5 === 0) status(`waiting-for-login (${i * 3}s)`);
  await page.waitForTimeout(3000);
}
if (!ok) { status("login-timeout"); await shot("timeout"); await ctx.close(); process.exit(2); }

const username = await page.locator('meta[name="user-login"]').getAttribute("content").catch(() => "") || "";
status(`logged-in as ${username} — generating token`);
await shot("form");

// Optional: set "No expiration" so the deploy token doesn't expire.
try {
  await page.locator("#token_expires, select[name='token_expiration']").first().selectOption({ label: "No expiration" }).catch(() => {});
} catch { /* leave default */ }
await page.waitForTimeout(400);

// Generate (there can be a confirm dialog for "no expiration").
await page.getByRole("button", { name: /Generate token/i }).first().click({ timeout: 15000 }).catch(() => {});
await page.waitForTimeout(1500);
await page.getByRole("button", { name: /^(I understand|Generate token)/i }).first().click({ timeout: 4000 }).catch(() => {});
await page.waitForTimeout(2500);
await shot("generated");

// Extract the ghp_ token from the page.
const token = await page.evaluate(() => {
  const m = document.body.innerText.match(/ghp_[A-Za-z0-9]{30,}/);
  if (m) return m[0];
  for (const el of document.querySelectorAll('input,code,span')) {
    const v = (el.value || el.textContent || "").trim();
    if (/^ghp_[A-Za-z0-9]{30,}$/.test(v)) return v;
  }
  return "";
}).catch(() => "");

if (token && username) {
  fs.writeFileSync(path.join(OUT, "gh-token.txt"), token);
  fs.writeFileSync(path.join(OUT, "gh-user.txt"), username);
  status(`TOKEN-CAPTURED for ${username} (${token.length} chars)`);
} else {
  status(`no-token (user=${username}) — see gh-generated.png`);
}
await page.waitForTimeout(45000);
await ctx.close();
process.exit(0);
