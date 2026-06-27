// Long-running LOCAL worker. Keep the laptop on and this running; it watches a
// queue and auto-posts approved items to X via the logged-in browser profile.
//
//   # Remote mode (Telegram bridge): pulls from the Railway bot's /xqueue
//   $env:NODE_OPTIONS='--use-system-ca'; $env:X_PROFILE='main';
//   $env:X_BRIDGE_URL='https://gl1tch-bot-production.up.railway.app';
//   $env:X_BRIDGE_TOKEN='<same token as on Railway>'; npm run x:worker
//
//   # Local mode (no bridge): pulls from e2e/x/out/post-queue.json (x-enqueue.mjs)
//   $env:NODE_OPTIONS='--use-system-ca'; $env:X_PROFILE='test'; npm run x:worker
//
// AUTHORIZED auto-send: calls postOne() which clicks Post. Human-paced; only
// posts what's been explicitly enqueued (i.e. what you approved in Telegram).
import fs from 'node:fs';
import path from 'node:path';
import { launchX } from './lib/launch.mjs';
import { isLoggedIn } from './lib/auth.mjs';
import { postOne } from './x-autopost.mjs';
import { takeNextPending, listPending, mark } from './lib/queue.mjs';
import { OUT_DIR } from './lib/paths.mjs';

const POLL_MS = Number(process.env.X_WORKER_POLL_MS || 15_000);
const GAP_MIN_MS = Number(process.env.X_WORKER_GAP_MIN_MS || 20_000);
const GAP_RANGE_MS = 40_000;

const BRIDGE_URL = (process.env.X_BRIDGE_URL || '').replace(/\/$/, '');
const BRIDGE_TOKEN = process.env.X_BRIDGE_TOKEN || '';
const REMOTE = Boolean(BRIDGE_URL && BRIDGE_TOKEN);

let stop = false;
process.on('SIGINT', () => { stop = true; console.log('\n[worker] durduruluyor...'); });

// ---- Remote bridge (poll the bot's /xqueue, ack back) ----
async function remoteClaim() {
  const res = await fetch(`${BRIDGE_URL}/xqueue`, { headers: { 'x-bridge-token': BRIDGE_TOKEN } });
  if (!res.ok) throw new Error(`xqueue ${res.status}`);
  const data = await res.json();
  return Array.isArray(data.items) ? data.items : [];
}

async function remoteAck(id, status, postedUrl, error) {
  await fetch(`${BRIDGE_URL}/xqueue/ack`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-bridge-token': BRIDGE_TOKEN },
    body: JSON.stringify({ id, status, postedUrl: postedUrl ?? null, error: error ?? null }),
  }).catch((e) => console.warn('[worker] ack gönderilemedi:', e.message));
}

// Bridge items carry an http imageUrl; download it so Playwright can attach it.
async function downloadMedia(url, id) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`media ${res.status}`);
  const ext = (url.split('?')[0].match(/\.(\w{2,4})$/)?.[1]) || 'bin';
  const dest = path.join(OUT_DIR, `media-${id}.${ext}`);
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
  return dest;
}

async function processItem(page, raw) {
  // Normalize remote/local shapes to what postOne expects.
  const item = {
    kind: raw.kind || 'post',
    text: raw.text,
    handle: raw.handle || undefined,
    tweetUrl: raw.tweetUrl || undefined,
    media: raw.media || undefined,
  };
  if (!item.media && raw.imageUrl) {
    try { item.media = await downloadMedia(raw.imageUrl, raw.id); }
    catch (e) { console.warn(`[worker] medya indirilemedi (${raw.id}):`, e.message); }
  }
  return postOne(page, item);
}

const { context, page } = await launchX();

try {
  if (!(await isLoggedIn(page))) {
    console.error('✗ Oturum yok. Önce: npm run x:login');
    process.exitCode = 1;
  } else {
    console.log(`[worker] hazır. Profil="${process.env.X_PROFILE || 'test'}". Mod=${REMOTE ? 'REMOTE (bot köprüsü)' : 'LOCAL (dosya kuyruğu)'}.`);
    if (REMOTE) console.log(`[worker] köprü: ${BRIDGE_URL}/xqueue`);
    else console.log(`[worker] bekleyen: ${listPending().length}`);
    console.log('[worker] Ctrl+C ile durdur.');

    let gapBase = 0;
    while (!stop) {
      let batch = [];
      try {
        batch = REMOTE ? await remoteClaim() : [takeNextPending()].filter(Boolean);
      } catch (e) {
        console.warn('[worker] kuyruk okunamadı:', e.message);
      }

      if (!batch.length) { await sleep(POLL_MS); continue; }

      for (const raw of batch) {
        if (stop) break;
        const id = raw.id;
        console.log(`\n[worker] gönderiliyor id=${id} (${raw.kind || 'post'})${raw.handle ? ' → @' + raw.handle : ''}`);
        console.log(`         ${String(raw.text).replace(/\n+/g, ' ').slice(0, 80)}…`);
        try {
          const r = await processItem(page, raw);
          if (r.ok) {
            if (REMOTE) await remoteAck(id, 'done', r.postedUrl); else mark(id, 'done', { postedUrl: r.postedUrl ?? null });
            console.log(`[worker] ✓ id=${id} gönderildi.${r.postedUrl ? ' ' + r.postedUrl : ''}`);
          } else {
            if (REMOTE) await remoteAck(id, 'error', null, r.error); else mark(id, 'error', { error: r.error });
            console.error(`[worker] ✗ id=${id}: ${r.error}`);
          }
        } catch (err) {
          const msg = err.message?.split('\n')[0];
          if (REMOTE) await remoteAck(id, 'error', null, msg); else mark(id, 'error', { error: msg });
          console.error(`[worker] ✗ id=${id}: ${msg}`);
        }

        // Human-paced gap before the next post (deterministic jitter via counter).
        gapBase = (gapBase + 7349) % GAP_RANGE_MS;
        const gap = GAP_MIN_MS + gapBase;
        if (!stop) {
          console.log(`[worker] ${Math.round(gap / 1000)}s bekleniyor...`);
          await sleep(gap);
        }
      }
    }
  }
} catch (err) {
  console.error('[worker] hata:', err.message?.split('\n')[0]);
  process.exitCode = 1;
} finally {
  await context.close();
}

function sleep(ms) {
  return new Promise((res) => {
    const t = setTimeout(res, ms);
    const iv = setInterval(() => { if (stop) { clearTimeout(t); clearInterval(iv); res(); } }, 500);
  });
}
