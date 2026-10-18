// Renders the Glitchy v3 mascot videos and transparent stills from pump-pack/mascot-v3/studio.html.
//
//   node scripts/glitchy-render.mjs video reveal-9x16 [--quality 1.5]   -> pump-pack/videos/glitchy-v3/<id>.mp4
//   node scripts/glitchy-render.mjs video all
//   node scripts/glitchy-render.mjs preview reveal-9x16 2.5,9.6,21.5    -> PNG frames at those seconds
//   node scripts/glitchy-render.mjs still all                           -> public/brand/glitchy-v3/<id>.png
//   node scripts/glitchy-render.mjs list
//
// Frames are deterministic (fixed 1/30s steps) and piped into ffmpeg as q95 JPEGs (fast, visually lossless
// before the x264 encode), so nothing large hits the disk.
// Needs network for the three.js CDN + font, and the real GPU (ANGLE/D3D11) for speed.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
import { soundtrack } from './glitchy-sound.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const OUT_VIDEO = path.join(ROOT, 'pump-pack', 'videos', 'glitchy-v3');
const OUT_STILL = path.join(ROOT, 'public', 'brand', 'glitchy-v3');
const OUT_PREVIEW = path.join(ROOT, 'pump-pack', 'mascot-v3', 'previews');

const [cmd = 'list', target = '', extra = ''] = process.argv.slice(2);
const flag = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i >= 0 ? process.argv[i + 1] : d; };
const QUALITY = Number(flag('quality', '1.5'));

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.png': 'image/png', '.json': 'application/json', '.css': 'text/css' };
function serve() {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
      if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      fs.createReadStream(p).pipe(res);
    });
    srv.listen(0, '127.0.0.1', () => resolve(srv));
  });
}

async function openStudio(browser, port, w, h) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => console.error('pageerror:', e.message));
  page.on('console', (m) => { if (m.type() === 'error') console.error('console:', m.text()); });
  await page.goto(`http://127.0.0.1:${port}/pump-pack/mascot-v3/studio.html`);
  await page.waitForFunction(() => window.__studioReady === true, null, { timeout: 60000 });
  return page;
}

function ffmpeg(args) {
  const p = spawn('ffmpeg', args, { stdio: ['pipe', 'ignore', 'pipe'] });
  let err = '';
  p.stderr.on('data', (d) => { err += d; if (err.length > 8000) err = err.slice(-8000); });
  const done = new Promise((res, rej) => p.on('close', (c) => (c === 0 ? res() : rej(new Error('ffmpeg failed:\n' + err)))));
  return { stdin: p.stdin, done };
}
const write = (stream, buf) => new Promise((res) => { if (!stream.write(buf)) stream.once('drain', res); else res(); });

async function renderVideo(browser, port, id) {
  const probe = await openStudio(browser, port, 64, 64);
  const ids = await probe.evaluate(() => window.studio.videos());
  await probe.close();
  if (!ids.includes(id)) throw new Error(`unknown video "${id}" (have: ${ids.join(', ')})`);
  const page = await openStudio(browser, port, 1920, 1920);
  const info = await page.evaluate(([v, q]) => window.studio.load(v, q), [id, QUALITY]);
  await page.setViewportSize({ width: info.w, height: info.h });
  fs.mkdirSync(OUT_VIDEO, { recursive: true });
  const silent = path.join(OUT_VIDEO, `.${id}.silent.mp4`);
  const enc = ffmpeg(['-y', '-f', 'image2pipe', '-c:v', 'mjpeg', '-framerate', String(info.fps), '-i', '-', '-c:v', 'libx264', '-preset', 'slow', '-crf', '16',
    '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-movflags', '+faststart', silent]);
  const t0 = Date.now();
  for (let i = 0; i < info.frames; i++) {
    await page.evaluate((n) => window.studio.frame(n), i);
    await write(enc.stdin, await page.screenshot({ clip: { x: 0, y: 0, width: info.w, height: info.h }, type: 'jpeg', quality: 95 }));
    if (i % 60 === 0) process.stdout.write(`\r${id}: frame ${i}/${info.frames} (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
  }
  enc.stdin.end();
  await enc.done;
  const cues = await page.evaluate(() => window.studio.cues());
  await page.close();
  // sound design from the cue list, muxed as AAC
  const wav = path.join(OUT_VIDEO, `.${id}.wav`);
  soundtrack(cues, info.frames / info.fps, wav, id);
  const out = path.join(OUT_VIDEO, `${id}.mp4`);
  const mux = ffmpeg(['-y', '-i', silent, '-i', wav, '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', out]);
  mux.stdin.end();
  await mux.done;
  fs.rmSync(silent); fs.rmSync(wav);
  console.log(`\r${id}: ${info.frames} frames in ${((Date.now() - t0) / 1000).toFixed(0)}s -> ${path.relative(ROOT, out)}`);
}

async function preview(browser, port, id, times) {
  const page = await openStudio(browser, port, 1920, 1920);
  const info = await page.evaluate(([v, q]) => window.studio.load(v, q), [id, QUALITY]);
  await page.setViewportSize({ width: info.w, height: info.h });
  fs.mkdirSync(OUT_PREVIEW, { recursive: true });
  const want = new Map(times.map((s) => [Math.round(Number(s) * info.fps), s]));
  const last = Math.max(...want.keys());
  for (let i = 0; i <= last; i++) {
    await page.evaluate((n) => window.studio.frame(n), i);
    if (want.has(i)) {
      const out = path.join(OUT_PREVIEW, `${id}@${want.get(i)}.png`);
      await page.screenshot({ path: out, clip: { x: 0, y: 0, width: info.w, height: info.h } });
      console.log('preview', path.relative(ROOT, out));
    }
  }
  await page.close();
}

async function stills(browser, port, which) {
  const page = await openStudio(browser, port, 64, 64);
  const ids = which === 'all' ? await page.evaluate(() => window.studio.stills()) : [which];
  fs.mkdirSync(OUT_STILL, { recursive: true });
  for (const id of ids) {
    const url = await page.evaluate((s) => window.studio.still(s), id);
    const out = path.join(OUT_STILL, `glitchy-${id}.png`);
    fs.writeFileSync(out, Buffer.from(url.split(',')[1], 'base64'));
    console.log('still', path.relative(ROOT, out));
  }
  await page.close();
}

const srv = await serve();
const port = srv.address().port;
const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });
try {
  if (cmd === 'list') {
    const page = await openStudio(browser, port, 64, 64);
    console.log('videos:', (await page.evaluate(() => window.studio.videos())).join(' '));
    console.log('stills:', (await page.evaluate(() => window.studio.stills())).join(' '));
  } else if (cmd === 'video') {
    const page = await openStudio(browser, port, 64, 64);
    const ids = target === 'all' ? await page.evaluate(() => window.studio.videos()) : target.split(',');
    await page.close();
    for (const id of ids) await renderVideo(browser, port, id);
  } else if (cmd === 'preview') {
    await preview(browser, port, target, extra.split(','));
  } else if (cmd === 'still') {
    await stills(browser, port, target || 'all');
  } else throw new Error('unknown command ' + cmd);
} finally {
  await browser.close();
  srv.close();
}
