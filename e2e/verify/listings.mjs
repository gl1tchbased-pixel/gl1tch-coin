// Human-in-the-loop driver for verifying GL1TCH socials on RugCheck + GeckoTerminal.
// Opens both pages in a maximized, persistent browser, pre-pastes the contract where it
// can, screenshots, then STAYS OPEN so the founder can connect their wallet (RugCheck)
// and enter the email OTP (GeckoTerminal). Free path only.
import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DIR = path.dirname(fileURLToPath(import.meta.url));
const PROFILE = path.resolve(DIR, ".profile");
const OUT = path.resolve(DIR, "out");
const CA = "3HQJwwHvzy8pGkPqGQcb4thZCH88MUCHVVSNtHn6pump";

fs.mkdirSync(PROFILE, { recursive: true });
fs.mkdirSync(OUT, { recursive: true });
for (const lock of ["SingletonLock", "SingletonCookie", "SingletonSocket"]) {
  try { fs.rmSync(path.resolve(PROFILE, lock), { force: true }); } catch { /* */ }
}

const BASE = {
  headless: false,
  viewport: null,
  locale: "en-US",
  timezoneId: "Europe/Istanbul",
  slowMo: 60,
  args: ["--disable-blink-features=AutomationControlled", "--start-maximized"],
};

let context, channel = "chrome";
try { context = await chromium.launchPersistentContext(PROFILE, { ...BASE, channel: "chrome" }); }
catch { channel = "chromium"; context = await chromium.launchPersistentContext(PROFILE, BASE); }
console.log(`[verify] browser=${channel} — TWO maximized tabs should open.`);

async function tryPaste(page, value) {
  // best-effort: drop the CA into the first visible text/search input
  const sels = ['input[type="text"]', 'input[type="search"]', 'input:not([type])', 'input[placeholder*="address" i]', 'input[placeholder*="token" i]'];
  for (const s of sels) {
    const el = page.locator(s).first();
    try { if (await el.isVisible({ timeout: 1500 })) { await el.fill(value); console.log(`[verify] prefilled ${s}`); return true; } } catch { /* next */ }
  }
  return false;
}

// Tab 1 — RugCheck verify
const rc = context.pages()[0] ?? (await context.newPage());
await rc.goto("https://rugcheck.xyz/verify/token", { waitUntil: "domcontentloaded" }).catch(() => {});
await rc.waitForTimeout(3500);
await tryPaste(rc, CA).catch(() => {});
await rc.bringToFront().catch(() => {});
await rc.screenshot({ path: path.resolve(OUT, "rugcheck-verify.png") }).catch(() => {});

// Tab 2 — GeckoTerminal update form
const gt = await context.newPage();
await gt.goto("https://www.geckoterminal.com/update-token-info", { waitUntil: "domcontentloaded" }).catch(() => {});
await gt.waitForTimeout(3500);
await gt.screenshot({ path: path.resolve(OUT, "geckoterminal-form.png") }).catch(() => {});

console.log("\n========== DO THIS IN THE BROWSER ==========");
console.log("RugCheck tab:  connect Phantom (creator wallet H5qb…aFb4) → paste CA → sign → add socials");
console.log("GeckoTerminal tab:  start form → paste CA + socials → email gl1tchbased@gmail.com → OTP → FREE option → submit");
console.log("CA: " + CA);
console.log("Values: pump-pack/listing-socials.md");
console.log("Browser stays open. Close it when done.\n");

// Stay open for the founder (up to ~30 min) and keep snapshotting progress.
for (let i = 0; i < 60; i++) {
  await rc.waitForTimeout(30000);
  await rc.screenshot({ path: path.resolve(OUT, "rugcheck-verify.png") }).catch(() => {});
  await gt.screenshot({ path: path.resolve(OUT, "geckoterminal-form.png") }).catch(() => {});
  if (context.pages().length === 0) break;
}
await context.close().catch(() => {});
