// Claude-driven Higgsfield video generation via the logged-in web app (UNLIMITED
// models = no credit burn). Selects the model, sets 9:16 ratio, types the prompt,
// clicks Generate, then polls for the finished <video> and downloads it.
//
//   PROMPT="..." MODEL="Kling 3.0 4K" RATIO="9:16" DURATION="5" OUTNAME="clip" \
//   HF_PROFILE=main NODE_OPTIONS=--use-system-ca node e2e/higgsfield/hf-gen.mjs
import fs from 'node:fs';
import path from 'node:path';
import { launchHF, OUT_DIR, VIDEOS_DIR } from './lib/launch.mjs';

const PROMPT = process.env.PROMPT || 'A glitchy neon ghost mascot materializes from digital static, green and purple energy, dark void, cinematic vertical clip';
const MODEL = process.env.MODEL || 'Kling 3.0 4K';
const RATIO = process.env.RATIO || '9:16';
const DURATION = process.env.DURATION || '';
const OUTNAME = process.env.OUTNAME || 'hf-web-clip';
const APP = 'https://higgsfield.ai/ai/video';

const shotN = (() => { let i = 0; return () => String(++i).padStart(2, '0'); })();
const shot = async (page, label) => {
  const p = path.join(OUT_DIR, `gen-${shotN()}-${label}.png`);
  await page.screenshot({ path: p }).catch(() => {});
  console.log(`[shot] ${p}`);
};

async function closeOverlays(page) {
  const ck = page.getByRole('button', { name: /accept all/i });
  if (await ck.first().isVisible().catch(() => false)) { await ck.first().click().catch(() => {}); await page.waitForTimeout(300); }
  for (const c of await page.getByRole('button', { name: /^close$/i }).all()) {
    if (await c.isVisible().catch(() => false)) { await c.click().catch(() => {}); await page.waitForTimeout(250); }
  }
}

// Collect REAL output mp4 URLs (cloudfront/amazonaws) — exclude static promo
// samples like static.higgsfield.ai/kling-3.0/kling-3.0.mp4.
function trackVideos(page, sink) {
  page.on('response', (r) => {
    const u = r.url();
    if (!/\.mp4(\?|$)/i.test(u)) return;
    if (/static\.higgsfield\.ai/i.test(u)) return;        // model preview clips
    if (/cloudfront|amazonaws/i.test(u)) sink.add(u);
  });
}

// Close the "Out of credits / set up auto-refill" modal WITHOUT buying or enabling
// refill. Returns true if it was present.
async function dismissCreditModal(page) {
  const dialog = page.getByText(/out of credits/i).first();
  if (await dialog.isVisible().catch(() => false)) {
    // close via the X, or Escape
    const x = page.getByRole('button', { name: /^close$/i });
    if (await x.first().isVisible().catch(() => false)) await x.first().click().catch(() => {});
    else await page.keyboard.press('Escape').catch(() => {});
    await page.waitForTimeout(800);
    return true;
  }
  return false;
}

const { context, page } = await launchHF();
const videoUrls = new Set();
trackVideos(page, videoUrls);

await page.goto(APP, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3500);
await closeOverlays(page);
await shot(page, 'composer');

// 1) Model
console.log(`[gen] selecting model: ${MODEL}`);
await page.getByRole('button', { name: 'Model' }).first().click().catch((e) => console.log('model open fail', e.message?.split('\n')[0]));
await page.waitForTimeout(1200);
const modelOpt = page.getByRole('button', { name: new RegExp('^' + MODEL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') });
await modelOpt.first().click().catch((e) => console.log('model pick fail', e.message?.split('\n')[0]));
await page.waitForTimeout(1500);
await shot(page, 'model-set');

// 2) Ratio
console.log(`[gen] setting ratio: ${RATIO}`);
await page.getByRole('button', { name: 'Ratio' }).first().click().catch(() => {});
await page.waitForTimeout(900);
const ratioOpt = page.getByRole('button', { name: new RegExp('^' + RATIO.replace('.', '\\.') + '$') })
  .or(page.getByText(new RegExp('^' + RATIO + '$')));
await ratioOpt.first().click().catch((e) => console.log('ratio pick fail', e.message?.split('\n')[0]));
await page.waitForTimeout(800);

// 3) Duration (optional)
if (DURATION) {
  await page.getByRole('button', { name: 'Duration' }).first().click().catch(() => {});
  await page.waitForTimeout(700);
  await page.getByRole('button', { name: new RegExp('^' + DURATION + 's$') }).first().click().catch(() => {});
  await page.waitForTimeout(600);
}
await shot(page, 'params-set');

// 4) Prompt
console.log('[gen] typing prompt');
const box = page.locator('div[role="textbox"]').first();
await box.click().catch(() => {});
await box.fill('').catch(() => {});
await page.keyboard.type(PROMPT, { delay: 8 }).catch(async () => { await box.fill(PROMPT).catch(() => {}); });
await page.waitForTimeout(600);
await shot(page, 'prompt-typed');

// 5) Generate (handle the auto-refill modal, then make sure the job actually starts)
const gen = page.getByRole('button', { name: /^Generate/i }).or(page.locator('button[type="submit"]'));
for (let attempt = 1; attempt <= 3; attempt++) {
  console.log(`[gen] clicking Generate (attempt ${attempt})`);
  await gen.first().click().catch((e) => console.log('generate click fail', e.message?.split('\n')[0]));
  await page.waitForTimeout(2500);
  const hadModal = await dismissCreditModal(page);
  if (hadModal) { console.log('[gen] dismissed the credit/auto-refill modal'); await page.waitForTimeout(800); continue; }
  break; // no modal -> generation submitted
}
await page.waitForTimeout(2500);
await shot(page, 'after-generate');

// 6) Poll for the finished video (Kling can take 1–4 min).
console.log('[gen] waiting for the video to render…');
let found = null;
for (let i = 0; i < 30; i++) {
  await page.waitForTimeout(10000);
  const src = await page.evaluate(() => {
    const v = [...document.querySelectorAll('video')].map((e) => e.currentSrc || e.src).filter(Boolean);
    return v.find((u) => /cloudfront|amazonaws/.test(u) && !/static\.higgsfield\.ai/.test(u)) || null;
  }).catch(() => null);
  const net = [...videoUrls];
  if (i % 3 === 0) await shot(page, `wait-${i}`);
  if ((src && !/blob:/.test(src)) || net.length) { found = (src && !src.startsWith('blob:')) ? src : net[net.length - 1]; console.log(`[gen] video URL: ${found}`); break; }
  console.log(`[gen] …still rendering (${(i + 1) * 10}s)`);
}

await shot(page, 'final');
// dump result-area controls so we can find the official Download button next time
const els = await page.evaluate(() => [...document.querySelectorAll('button,a,[role="button"],[data-testid]')]
  .filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; })
  .map((e) => ({ tag: e.tagName.toLowerCase(), aria: e.getAttribute('aria-label') || undefined, title: e.getAttribute('title') || undefined, text: (e.innerText || '').trim().slice(0, 30) || undefined, href: e.getAttribute('href') || undefined }))
  .filter((e) => e.text || e.aria || e.title));
fs.writeFileSync(path.join(OUT_DIR, 'gen-result-controls.json'), JSON.stringify(els, null, 2));

if (found && !found.startsWith('blob:')) {
  try {
    const res = await page.request.get(found);
    const buf = await res.body();
    const out = path.join(VIDEOS_DIR, `${OUTNAME}.mp4`);
    fs.writeFileSync(out, buf);
    console.log(`[gen] ✅ downloaded -> ${out} (${(buf.length / 1e6).toFixed(1)} MB)`);
  } catch (e) { console.log('[gen] download failed:', e.message?.split('\n')[0], '\nURL:', found); }
} else {
  console.log('[gen] ⚠️ no downloadable URL captured — see gen-*.png + gen-result-controls.json');
}

await context.close();
process.exit(0);
