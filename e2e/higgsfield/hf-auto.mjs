// Claude-driven login + capture. Non-interactive so it can be run head-lessly-ish
// from the tool side (window still shows on screen). Clicks Log in, follows the
// Google OAuth (auto-completes if the account is remembered in this profile),
// then screenshots + dumps the authenticated video composer.
//   HF_PROFILE=main NODE_OPTIONS=--use-system-ca node e2e/higgsfield/hf-auto.mjs
import fs from 'node:fs';
import path from 'node:path';
import { launchHF, OUT_DIR } from './lib/launch.mjs';

const VIDEO_URL = 'https://higgsfield.ai/ai-video';
const shotN = (() => { let i = 0; return () => String(++i).padStart(2, '0'); })();

const shot = async (page, label) => {
  const p = path.join(OUT_DIR, `auto-${shotN()}-${label}.png`);
  await page.screenshot({ path: p }).catch((e) => console.log(`[shot fail] ${e.message?.split('\n')[0]}`));
  console.log(`[shot] ${p}`);
};

async function loggedIn(page) {
  const loginVis = await page.getByRole('button', { name: /^log ?in$/i }).first().isVisible().catch(() => false);
  const signupVis = await page.getByRole('link', { name: /^sign ?up$/i }).first().isVisible().catch(() => false);
  const signupBtn = await page.getByRole('button', { name: /^sign ?up$/i }).first().isVisible().catch(() => false);
  return !(loginVis || signupVis || signupBtn);
}

async function dismissCookies(page) {
  const b = page.getByRole('button', { name: /accept all/i });
  if (await b.first().isVisible().catch(() => false)) { await b.first().click().catch(() => {}); await page.waitForTimeout(400); }
}

async function dumpEls(page, tag) {
  const els = await page.evaluate(() => {
    const vis = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
    const d = (el) => { const r = el.getBoundingClientRect(); return {
      tag: el.tagName.toLowerCase(), type: el.getAttribute('type') || undefined, role: el.getAttribute('role') || undefined,
      placeholder: el.getAttribute('placeholder') || undefined, aria: el.getAttribute('aria-label') || undefined,
      text: (el.innerText || el.value || '').trim().slice(0, 50) || undefined, testid: el.getAttribute('data-testid') || undefined,
      box: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) } }; };
    const sel = 'button, a, textarea, input, select, [role="button"], [role="combobox"], [role="listbox"], [role="option"], [contenteditable="true"], [data-testid]';
    return [...document.querySelectorAll(sel)].filter(vis).map(d);
  });
  fs.writeFileSync(path.join(OUT_DIR, `auto-dump-${tag}.json`), JSON.stringify(els, null, 2));
  console.log(`[dump] ${els.length} els -> auto-dump-${tag}.json`);
}

const { context, page } = await launchHF();
// Capture any OAuth popup that opens.
let popup = null;
context.on('page', (p) => { popup = p; console.log('[popup] opened ->', p.url()); });

await page.goto(VIDEO_URL, { waitUntil: 'domcontentloaded' }).catch(() => {});
await page.waitForTimeout(2500);
await dismissCookies(page);
await shot(page, 'landing');

if (await loggedIn(page)) {
  console.log('[auto] Already logged in.');
} else {
  console.log('[auto] Logged out — clicking Log in…');
  const loginBtn = page.getByRole('button', { name: /^log ?in$/i }).or(page.getByRole('link', { name: /^log ?in$/i }));
  await loginBtn.first().click().catch((e) => console.log('[click fail]', e.message?.split('\n')[0]));
  await page.waitForTimeout(2500);
  await shot(page, 'after-login-click');
  await dumpEls(page, 'login-modal');

  // Try a "Continue with Google" control in the page or modal.
  const g = page.getByRole('button', { name: /google/i }).or(page.getByText(/continue with google/i));
  if (await g.first().isVisible().catch(() => false)) {
    console.log('[auto] Clicking Continue with Google…');
    await g.first().click().catch((e) => console.log('[g click fail]', e.message?.split('\n')[0]));
    await page.waitForTimeout(4000);
  }
  // If an OAuth popup opened with an account chooser, click the first account.
  if (popup) {
    await popup.waitForLoadState('domcontentloaded').catch(() => {});
    await popup.waitForTimeout(2000);
    await popup.screenshot({ path: path.join(OUT_DIR, 'auto-google-popup.png') }).catch(() => {});
    const acct = popup.locator('[data-identifier], [role="link"]').first();
    if (await acct.isVisible().catch(() => false)) { await acct.click().catch(() => {}); }
    await page.waitForTimeout(5000);
  }
  await page.goto(VIDEO_URL, { waitUntil: 'domcontentloaded' }).catch(() => {});
  await page.waitForTimeout(3000);
  await dismissCookies(page);
  await shot(page, 'post-oauth');
}

const ok = await loggedIn(page);
console.log(`[auto] login state: ${ok ? '✅ logged in' : '❌ logged out'}`);
if (ok) {
  await shot(page, 'composer');
  await dumpEls(page, 'composer');
}

await context.close();
process.exit(ok ? 0 : 1);
