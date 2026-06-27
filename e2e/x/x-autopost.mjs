// AUTHORIZED AUTO-POSTER (founder opt-in 2026-06-01, "Playwright ile yerel otomatik").
//
// Unlike x-campaign.mjs (which only prefills and lets the human click), THIS file
// deliberately clicks the final Post/Reply button. It is a SEPARATE, explicitly
// named component so the human-in-the-loop campaign path stays untouched and its
// "no send selector" invariant holds. The send selectors live here on purpose.
//
// Standalone test:
//   $env:NODE_OPTIONS='--use-system-ca'; $env:X_PROFILE='test'; node e2e/x/x-autopost.mjs --text "hello 🤖"
//   ...optional: --media glitchy-share-square.mp4   --reply @someone   --reply https://x.com/.../status/123
import { launchX } from './lib/launch.mjs';
import { S } from './lib/selectors.mjs';
import { isLoggedIn } from './lib/auth.mjs';
import { resolveMedia, OUT_DIR } from './lib/paths.mjs';
import path from 'node:path';

// The deliberate, authorized send buttons (kept out of the shared selectors file).
const SEND = {
  post: '[data-testid="tweetButton"]',
  reply: '[data-testid="tweetButtonInline"]',
};

async function prefill(page, text, mediaAbs) {
  const box = page.locator(S.composerBox).first();
  await box.waitFor({ state: 'visible', timeout: 30_000 });
  // The compose dialog can still be animating in; its backdrop briefly intercepts
  // pointer events. Let it settle, then click with force, falling back to focus.
  await page.waitForTimeout(1500);
  await box.click({ timeout: 8000 }).catch(async () => {
    await box.click({ force: true, timeout: 8000 }).catch(async () => { await box.focus().catch(() => {}); });
  });
  await page.keyboard.type(text, { delay: 25 });
  if (mediaAbs) {
    await page.locator(S.fileInput).first().setInputFiles(mediaAbs);
    // 1) attachment thumbnail appears
    await page.locator('[data-testid="attachments"], [aria-label="Remove media"], [data-testid="removeMedia"]')
      .first().waitFor({ state: 'visible', timeout: 60_000 }).catch(() => {});
    // 2) CRITICAL: wait for the upload to FINISH — X shows a progress ring while
    // uploading, and clicking Post during it silently no-ops. Wait for every
    // progressbar to detach, then settle. Video also needs server-side ENCODING
    // after upload (longer), so give it a generous window.
    await page.locator('[role="progressbar"]').first()
      .waitFor({ state: 'detached', timeout: 180_000 }).catch(() => {});
    await page.waitForTimeout(4000);
  }
}

/**
 * Post (or reply to) a single item using the logged-in session, clicking send.
 * @returns {Promise<{ok: boolean, error?: string}>}
 */
export async function postOne(page, item) {
  let sendSel;
  if (item.kind === 'reply') {
    let url = item.tweetUrl;
    if (!url && item.handle) {
      const h = String(item.handle).replace(/^@/, '');
      await page.goto(`https://x.com/${h}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1500);
      for (const art of await page.locator(S.tweet).all()) {
        const pinned = await art.locator(S.socialContext).first().innerText().catch(() => '');
        if (/pinned/i.test(pinned || '')) continue;
        const href = await art.locator(S.statusLink).first().getAttribute('href').catch(() => null);
        if (href && /\/status\/\d+/.test(href)) { url = `https://x.com${href}`; break; }
      }
    }
    if (!url) return { ok: false, error: `reply hedefi çözülemedi (${item.handle})` };
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200);
    await page.locator(S.replyIcon).first().click(); // opens composer
    sendSel = SEND.reply;
  } else {
    await page.goto('https://x.com/compose/post', { waitUntil: 'domcontentloaded' });
    sendSel = SEND.post;
  }

  await prefill(page, item.text, resolveMedia(item.media));

  const btn = page.locator(sendSel).first();
  await btn.waitFor({ state: 'visible', timeout: 30_000 });
  // X keeps Post disabled until text is registered AND any attached media has
  // finished uploading AND (for video) finished server-side encoding. Poll until
  // enabled — videos can take well over a minute, so wait longer when media is set.
  const maxPoll = item.media ? 180 : 40;
  let enabled = false;
  for (let i = 0; i < maxPoll; i++) {
    if (!(await btn.isDisabled().catch(() => true))) { enabled = true; break; }
    await page.waitForTimeout(1000);
  }
  if (!enabled) {
    await page.screenshot({ path: path.join(OUT_DIR, 'autopost-disabled.png') }).catch(() => {});
    return { ok: false, error: 'gönder butonu pasif (metin/medya hazır değil)' };
  }
  await page.waitForTimeout(500);
  // PRIMARY publish: Ctrl+Enter. Clicking the Post button silently no-ops for
  // image posts (button-click interception); the keyboard shortcut is reliable.
  // Fall back to a button click only if the composer is still open afterwards.
  const composer = page.locator(S.composerBox).first();
  await composer.click().catch(() => {});
  await page.keyboard.press('Control+Enter');
  const took = await composer.waitFor({ state: 'detached', timeout: 12_000 }).then(() => true).catch(() => false);
  if (!took) await btn.click().catch(() => {});

  // Robust success detection: race several signals. The most reliable is X's
  // confirmation toast ("Your post was sent"); also accept the composer
  // detaching or (for posts) a redirect to /home.
  const toast = page.locator('[data-testid="toast"]');
  const sent = await Promise.race([
    toast.waitFor({ state: 'visible', timeout: 25_000 }).then(() => true).catch(() => null),
    page.locator(S.composerBox).first().waitFor({ state: 'detached', timeout: 25_000 }).then(() => true).catch(() => null),
    page.waitForURL(/\/home$/, { timeout: 25_000 }).then(() => true).catch(() => null),
  ]).catch(() => null);

  // Try to capture the posted URL from the toast's "View" link.
  let postedUrl = null;
  try {
    const view = toast.locator('a[href*="/status/"]').first();
    const href = await view.getAttribute('href', { timeout: 2000 });
    if (href) postedUrl = href.startsWith('http') ? href : `https://x.com${href}`;
  } catch { /* toast may already be gone */ }

  await page.screenshot({ path: path.join(OUT_DIR, `autopost-${sent ? 'ok' : 'fail'}.png`) }).catch(() => {});

  return sent
    ? { ok: true, postedUrl }
    : { ok: false, error: 'gönderim doğrulanamadı (toast/redirect/komposer sinyali yok)' };
}

// ---- CLI entry (only when run directly, not when imported by the worker) ----
import { fileURLToPath } from 'node:url';
const isDirect = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];

if (isDirect) {
  const args = process.argv.slice(2);
  const get = (flag) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : undefined; };
  const text = get('--text');
  const media = get('--media');
  const reply = get('--reply');
  if (!text) {
    console.error('Kullanım: node e2e/x/x-autopost.mjs --text "..." [--media dosya] [--reply @handle|url]');
    process.exit(1);
  }
  const item = reply
    ? { kind: 'reply', text, media, [/^https?:/.test(reply) ? 'tweetUrl' : 'handle']: reply }
    : { kind: 'post', text, media };

  const { context, page } = await launchX();
  try {
    if (!(await isLoggedIn(page))) { console.error('✗ Oturum yok. Önce: npm run x:login'); process.exitCode = 1; }
    else {
      console.log(`[autopost] gönderiliyor (${item.kind})...`);
      const r = await postOne(page, item);
      if (r.ok) console.log('✓ Gönderildi.');
      else { console.error('✗ Gönderilemedi:', r.error); process.exitCode = 1; }
    }
  } finally {
    await context.close();
  }
}
