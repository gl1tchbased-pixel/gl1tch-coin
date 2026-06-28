// Fills + submits the GeckoTerminal free "Update Token Info" form for GL1TCH.
// Isolated Chromium. Screenshots before/after. If a Cloudflare/Turnstile captcha is
// present, it fills everything and PAUSES so the founder can solve it + click Submit.
import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DIR = path.dirname(fileURLToPath(import.meta.url));
const PROFILE = path.resolve(DIR, ".profile-gt6");
const OUT = path.resolve(DIR, "out");
fs.mkdirSync(PROFILE, { recursive: true });
fs.mkdirSync(OUT, { recursive: true });
for (const l of ["SingletonLock", "SingletonCookie", "SingletonSocket"]) { try { fs.rmSync(path.resolve(PROFILE, l), { force: true }); } catch { /* */ } }

const CA = "3HQJwwHvzy8pGkPqGQcb4thZCH88MUCHVVSNtHn6pump";
const POOL = "https://www.geckoterminal.com/solana/pools/9fi2sFnnySPhNwJZPzZwxZT3xQnjPa9dh3EQbVNCstRW";
const DESC = "GL1TCH is a rogue-AI meme on Solana with a free, non-custodial token safety scanner. Zero tax, mint & freeze revoked, liquidity locked. It reads the chain; it never touches your wallet.";

const ctx = await chromium.launchPersistentContext(PROFILE, {
  headless: false, viewport: null, locale: "en-US", timezoneId: "Europe/Istanbul", slowMo: 80,
  args: ["--disable-blink-features=AutomationControlled", "--start-maximized"],
});
const p = ctx.pages()[0] ?? (await ctx.newPage());
const shot = (n) => p.screenshot({ path: path.resolve(OUT, n), fullPage: true }).catch(() => {});
const fill = async (sel, val) => { try { const el = p.locator(sel).first(); await el.scrollIntoViewIfNeeded({ timeout: 2000 }); await el.fill(val); console.log("filled", sel); } catch (e) { console.log("MISS", sel, e.message.slice(0, 40)); } };

await p.goto("https://www.geckoterminal.com/request-form/update-token?fast_pass=false", { waitUntil: "domcontentloaded" }).catch(() => {});
await p.waitForTimeout(4500);
for (const d of ["button:has-text('Dismiss')", "button:has-text('Accept')"]) { try { const b = p.locator(d).first(); if (await b.isVisible({ timeout: 1000 })) await b.click(); } catch { /* */ } }

await fill("#project_name", "GL1TCH");
await fill("#website", "https://coin-three-mu.vercel.app");
await fill("#geckoterminal_link", POOL);
await fill("#description", DESC);
await fill('input[name="socials.0.value"]', "gl1tch_infected");        // Telegram handle
await fill('input[name="socials.1.value"]', "gl1tchbased");            // Twitter handle
await fill('input[name="socials.8.value"]', "gl1tch_infected");        // Instagram handle
await fill('input[name="socials.11.value"]', "gl1tchbased-pixel/gl1tch-coin"); // GitHub repo
await fill("#project_owner_telegram_handle", "gl1tch_infected");
await fill("#additional_info", "Token-2022 mint. Mint & freeze authorities revoked, 0% transfer tax, LP locked/burned, RugCheck score 1. Open source: github.com/gl1tchbased-pixel/gl1tch-coin");

// Token contract combobox (type CA → pick option)
try {
  const cab = p.getByPlaceholder("Select Token's Contract Address").first();
  await cab.scrollIntoViewIfNeeded({ timeout: 2000 });
  await cab.click();
  await cab.type(CA, { delay: 15 });
  await p.waitForTimeout(2500);
  await p.keyboard.press("ArrowDown");
  await p.keyboard.press("Enter");
  console.log("CA combobox set");
} catch (e) { console.log("CA combobox MISS", e.message.slice(0, 50)); }

// Linkback = Yes, acknowledge disclaimer
try { await p.locator("#willing_to_linkback_Yes").check({ force: true }); } catch { /* */ }
try { await p.locator("#disclaimer_acknowledged").check({ force: true }); } catch { /* */ }

await p.waitForTimeout(1000);
await shot("gt-filled.png");

// Captcha / Turnstile detection
const hasCaptcha = await p.evaluate(() => !!document.querySelector('iframe[src*="challenges.cloudflare"], iframe[src*="hcaptcha"], iframe[title*="captcha" i], iframe[src*="recaptcha"]')).catch(() => false);
console.log("CAPTCHA_PRESENT=" + hasCaptcha);

if (hasCaptcha) {
  console.log("[gt] captcha present — FILLED everything; founder solves captcha + clicks Submit. Staying open 12 min.");
  await p.waitForTimeout(720000);
} else {
  try {
    const sub = p.getByRole("button", { name: /^submit$/i }).first();
    await sub.scrollIntoViewIfNeeded({ timeout: 2000 });
    await sub.click();
    console.log("[gt] Submit clicked");
    await p.waitForTimeout(5000);
    await shot("gt-submitted.png");

    // Email Verification modal: fill email + request OTP.
    await fill('input[type="email"]', "gl1tchbased@gmail.com");
    // dump modal controls so we can see the send/verify buttons + OTP input
    const modal = await p.evaluate(() => Array.from(document.querySelectorAll("button,input")).filter(e => { const r = e.getBoundingClientRect(); return r.width > 2 && r.height > 2; }).map(e => `${e.tagName.toLowerCase()}${e.type ? "[" + e.type + "]" : ""} #${e.id || ""} :: ${(e.innerText || e.value || e.placeholder || "").trim().slice(0, 40)}`)).catch(() => []);
    console.log("MODAL_CONTROLS:\n" + modal.join("\n"));
    // click the send/continue/verify button in the modal
    for (const re of [/send code/i, /send otp/i, /get code/i, /verify/i, /continue/i, /send/i, /submit/i]) {
      try { const b = p.getByRole("button", { name: re }).first(); if (await b.isVisible({ timeout: 1000 })) { await b.click(); console.log("[gt] clicked modal button: " + re); break; } } catch { /* */ }
    }
    await p.waitForTimeout(4000);
    await shot("gt-otp.png");
    console.log("OTP_STAGE=ready — founder: enter the code from gl1tchbased@gmail.com inbox, then final submit.");
  } catch (e) { console.log("[gt] submit MISS", e.message.slice(0, 60)); }
  console.log("[gt] staying open 14 min for OTP entry.");
  await p.waitForTimeout(840000);
}
await ctx.close().catch(() => {});
