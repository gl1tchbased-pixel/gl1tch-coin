// Drives the GeckoTerminal "Update Token Info" FREE form. Separate profile (no wallet).
// Navigates the free path ("proceed without a Fast Pass"), then fills the form with the
// GL1TCH values. Dumps fields + screenshots at each step. Pauses for the email OTP.
import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DIR = path.dirname(fileURLToPath(import.meta.url));
const PROFILE = path.resolve(DIR, ".profile-gt3");
const OUT = path.resolve(DIR, "out");
fs.mkdirSync(PROFILE, { recursive: true });
fs.mkdirSync(OUT, { recursive: true });
for (const lock of ["SingletonLock", "SingletonCookie", "SingletonSocket"]) {
  try { fs.rmSync(path.resolve(PROFILE, lock), { force: true }); } catch { /* */ }
}

const V = {
  ca: "3HQJwwHvzy8pGkPqGQcb4thZCH88MUCHVVSNtHn6pump",
  name: "GL1TCH",
  symbol: "GL1TCH",
  website: "https://coin-three-mu.vercel.app",
  x: "https://x.com/gl1tchbased",
  tg: "https://t.me/gl1tch_infected",
  ig: "https://instagram.com/gl1tch_infected",
  email: "gl1tchbased@gmail.com",
  desc: "GL1TCH is a rogue-AI meme on Solana with a free, non-custodial token safety scanner. Zero tax, mint & freeze revoked, liquidity locked. It reads the chain; it never touches your wallet.",
};

// NOTE: bundled Chromium (no channel) — real Chrome merges into the user's running
// session and detaches Playwright. Chromium stays isolated and fully controllable.
const ctx = await chromium.launchPersistentContext(PROFILE, {
  headless: false, viewport: null, locale: "en-US", timezoneId: "Europe/Istanbul", slowMo: 70,
  args: ["--disable-blink-features=AutomationControlled", "--start-maximized"],
});

const p = ctx.pages()[0] ?? (await ctx.newPage());
const click = async (re, role = "link") => { try { const el = p.getByRole(role, { name: re }).first(); if (await el.isVisible({ timeout: 1500 })) { await el.click(); return true; } } catch { /* */ } return false; };
async function dump(tag) {
  await p.screenshot({ path: path.resolve(OUT, `gt-${tag}.png`), fullPage: true }).catch(() => {});
  const els = await p.evaluate(() => Array.from(document.querySelectorAll("button,a,input,textarea,select")).filter(e => { const r = e.getBoundingClientRect(); return r.width > 2 && r.height > 2; }).map(e => `${e.tagName.toLowerCase()}${e.type ? "[" + e.type + "]" : ""} #${e.id || ""} name=${e.name || ""} :: ${(e.innerText || e.value || e.placeholder || e.getAttribute("aria-label") || "").trim().slice(0, 50)}`)).catch(() => []);
  console.log(`\n--- ${tag} :: ${p.url()} ---\n` + els.join("\n"));
}

await p.goto("https://www.geckoterminal.com/update-token-info", { waitUntil: "domcontentloaded" }).catch(() => {});
await p.waitForTimeout(3500);
for (const d of [/dismiss/i, /accept/i, /got it/i]) await click(d, "button");
// Free path
if (!(await click(/proceed without a Fast Pass/i))) { await click(/let.?s go/i); await p.waitForTimeout(2500); await click(/proceed without a Fast Pass/i); }
await p.waitForTimeout(4000);
await dump("form1");

console.log("\n[gt] reached form — staying open 6 min. Inspect dump + screenshot, then we fill.");
await p.waitForTimeout(360000);
await ctx.close().catch(() => {});
