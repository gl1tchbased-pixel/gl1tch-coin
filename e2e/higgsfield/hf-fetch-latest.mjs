// Open the app, go to History, open the newest result, force the <video> to load
// its real (cloudfront) src, and download it to pump-pack/videos.
//   OUTNAME=clip HF_PROFILE=main NODE_OPTIONS=--use-system-ca node e2e/higgsfield/hf-fetch-latest.mjs
import fs from 'node:fs';
import path from 'node:path';
import { launchHF, OUT_DIR, VIDEOS_DIR } from './lib/launch.mjs';

const OUTNAME = process.env.OUTNAME || 'gl1tch-web-latest';
const { context, page } = await launchHF();
const netUrls = new Set();
page.on('response', (r) => { const u = r.url(); if (/\.mp4(\?|$)/i.test(u) && /cloudfront|amazonaws/i.test(u) && !/static\.higgsfield\.ai/i.test(u)) netUrls.add(u); });

await page.goto('https://higgsfield.ai/ai/video', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3500);
for (const c of await page.getByRole('button', { name: /accept all/i }).all()) { await c.click().catch(() => {}); }
for (const c of await page.getByRole('button', { name: /^close$/i }).all()) { await c.click().catch(() => {}); await page.waitForTimeout(200); }

// History tab
await page.getByRole('tab', { name: /history/i }).click().catch(() => {});
await page.waitForTimeout(2500);
await page.screenshot({ path: path.join(OUT_DIR, 'fetch-history.png') });

// open the newest result (first video/thumb in the history grid)
const firstVid = page.locator('video').first();
await firstVid.click().catch(() => {});
await page.waitForTimeout(1500);
// force load + play to populate currentSrc
const src = await page.evaluate(async () => {
  const vids = [...document.querySelectorAll('video')];
  for (const v of vids) { try { v.muted = true; await v.play().catch(() => {}); } catch {} }
  await new Promise((r) => setTimeout(r, 1500));
  const urls = vids.map((v) => v.currentSrc || v.src).filter(Boolean);
  return urls.find((u) => /cloudfront|amazonaws/.test(u) && !/static\.higgsfield\.ai/.test(u)) || urls[0] || null;
}).catch(() => null);
await page.screenshot({ path: path.join(OUT_DIR, 'fetch-opened.png') });

const found = (src && !src.startsWith('blob:')) ? src : [...netUrls].pop();
console.log('[fetch] candidate URL:', found || '(none)');
console.log('[fetch] network mp4s seen:', [...netUrls].length);

if (found && !found.startsWith('blob:')) {
  try {
    const res = await page.request.get(found);
    const buf = await res.body();
    const out = path.join(VIDEOS_DIR, `${OUTNAME}.mp4`);
    fs.writeFileSync(out, buf);
    console.log(`[fetch] ✅ downloaded -> ${out} (${(buf.length / 1e6).toFixed(1)} MB)`);
  } catch (e) { console.log('[fetch] download failed:', e.message?.split('\n')[0]); }
} else if (found && found.startsWith('blob:')) {
  // blob: fetch inside the page, return base64
  const b64 = await page.evaluate(async (u) => { const r = await fetch(u); const b = await r.blob();
    return await new Promise((res) => { const fr = new FileReader(); fr.onloadend = () => res(fr.result); fr.readAsDataURL(b); }); }, found).catch(() => null);
  if (b64) { const data = b64.split(',')[1]; fs.writeFileSync(path.join(VIDEOS_DIR, `${OUTNAME}.mp4`), Buffer.from(data, 'base64')); console.log('[fetch] ✅ downloaded via blob'); }
  else console.log('[fetch] blob fetch failed');
} else {
  console.log('[fetch] ⚠️ no URL — see fetch-*.png');
}
await context.close();
process.exit(0);
