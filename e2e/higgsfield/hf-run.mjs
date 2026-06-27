// Single long-lived session driver for Higgsfield video generation.
// Higgsfield's auth does NOT survive a context close (token lives in
// sessionStorage), so we log in ONCE and do everything in the same run.
//
// MODE=map   -> log in, then screenshot + dump the authenticated video composer
//               so Claude can write exact selectors. (default)
// MODE=gen   -> log in, then process jobs from jobs.json (filled in later).
//
//   cd <repo>; $env:HF_PROFILE="main"; $env:NODE_OPTIONS="--use-system-ca"; npm run hf:run
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { launchHF, OUT_DIR } from './lib/launch.mjs';

const MODE = process.env.MODE || 'map';
const VIDEO_URL = 'https://higgsfield.ai/ai-video';

const ask = (q) => new Promise((res) => {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl.question(q, () => { rl.close(); res(); });
});

async function loggedIn(page) {
  // Only a VISIBLE Log in / Sign up control means logged out — a hidden footer
  // "Login" link must not count (it caused false negatives).
  const loginVis = await page.getByRole('button', { name: /^log ?in$/i }).first()
    .isVisible().catch(() => false);
  const signupVis = await page.getByRole('link', { name: /^sign ?up$/i }).first()
    .isVisible().catch(() => false);
  return !(loginVis || signupVis);
}

async function shot(page, name) {
  const p = path.join(OUT_DIR, name);
  await page.screenshot({ path: p, fullPage: false }).catch(() => {});
  console.log(`[shot] ${p}`);
}

async function dumpComposer(page, tag) {
  const els = await page.evaluate(() => {
    const vis = (el) => {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && r.top < innerHeight + 200;
    };
    const d = (el) => {
      const r = el.getBoundingClientRect();
      return {
        tag: el.tagName.toLowerCase(),
        type: el.getAttribute('type') || undefined,
        role: el.getAttribute('role') || undefined,
        placeholder: el.getAttribute('placeholder') || undefined,
        aria: el.getAttribute('aria-label') || undefined,
        text: (el.innerText || el.value || '').trim().slice(0, 50) || undefined,
        testid: el.getAttribute('data-testid') || undefined,
        box: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
      };
    };
    const sel = 'button, a, textarea, input, select, [role="button"], [role="combobox"], [role="listbox"], [role="option"], [contenteditable="true"], [data-testid]';
    return [...document.querySelectorAll(sel)].filter(vis).map(d);
  });
  const f = path.join(OUT_DIR, `hf-composer-${tag}.json`);
  fs.writeFileSync(f, JSON.stringify(els, null, 2));
  console.log(`[dump] ${els.length} els -> ${f}`);
}

async function dismissCookies(page) {
  for (const name of [/accept all/i, /accept/i]) {
    const b = page.getByRole('button', { name }).or(page.locator('[role="button"]').filter({ hasText: name }));
    if (await b.first().isVisible().catch(() => false)) {
      await b.first().click().catch(() => {});
      await page.waitForTimeout(400);
      break;
    }
  }
}

// ---- run ----
const { context, page } = await launchHF();
await page.goto(VIDEO_URL, { waitUntil: 'domcontentloaded' }).catch(() => {});
await page.waitForTimeout(2500);
await dismissCookies(page);

// Login gate — does NOT continue until actually logged in. Higgsfield's session
// dies on context close, so you must log in (Google) IN THIS WINDOW every run.
let tries = 0;
while (!(await loggedIn(page))) {
  tries++;
  console.log(`\n[hf-run] ⛔ This automation window is LOGGED OUT (top-right shows "Sign up").`);
  console.log('[hf-run] In THIS exact window: click Log in → sign in with Google.');
  console.log('[hf-run] Wait until your avatar/credits appear top-right, THEN press Enter here.');
  console.log('[hf-run] (type "skip" + Enter to override if you are sure you are logged in)\n');
  const answer = await new Promise((res) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(`Logged in now? press Enter to re-check (attempt ${tries})… `, (a) => { rl.close(); res(a.trim()); });
  });
  if (answer.toLowerCase() === 'skip') break;
  await page.goto(VIDEO_URL, { waitUntil: 'domcontentloaded' }).catch(() => {});
  await page.waitForTimeout(2500);
  await dismissCookies(page);
  if (tries >= 5) { console.log('[hf-run] Too many attempts. If Google blocks login here, tell Claude — we switch to Plan B (real Chrome session).'); break; }
}
console.log(`[hf-run] login check: ${(await loggedIn(page)) ? '✅ logged in' : '⚠️ still uncertain (continuing)'}`);

if (MODE === 'map') {
  await page.waitForTimeout(1500);
  await shot(page, 'composer-top.png');
  await dumpComposer(page, 'video');
  // Click the prompt box and screenshot, so we can see the model/aspect/duration controls around it.
  const ta = page.getByPlaceholder(/describe any visual idea/i).first();
  if (await ta.count()) {
    await ta.click().catch(() => {});
    await page.waitForTimeout(800);
    await shot(page, 'composer-focused.png');
  }
  console.log('\n[hf-run] MAP done. Leaving the browser OPEN so the session stays alive.');
  console.log('[hf-run] Look at the screenshots/dump, then press Enter here to close.');
  await ask('Press Enter to close… ');
}

await context.close();
process.exit(0);
