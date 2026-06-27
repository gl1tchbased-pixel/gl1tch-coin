// Stage 3 — Prepare + open for one-click send.
// Walks the content queue. For each item it opens the logged-in composer (or a
// target's latest tweet's reply box) and PREFILLS the text (+ optional media),
// then STOPS and waits for you to review and click Post/Reply YOURSELF.
//
//   $env:NODE_OPTIONS='--use-system-ca'; $env:X_PROFILE='test'; npm run x:campaign
//
// SAFETY INVARIANT: this script never locates or clicks the send button
// (tweetButton / tweetButtonInline). The only thing that advances the loop is
// you pressing Enter. Playwright opens and types; you send.
import fs from 'node:fs';
import path from 'node:path';
import { launchX } from './lib/launch.mjs';
import { S } from './lib/selectors.mjs';
import { ask } from './lib/prompt.mjs';
import { isLoggedIn } from './lib/auth.mjs';
import { DATA_DIR, resolveMedia } from './lib/paths.mjs';

function loadQueue() {
  const p = path.join(DATA_DIR, 'content-queue.json');
  const raw = JSON.parse(fs.readFileSync(p, 'utf8'));
  return Array.isArray(raw) ? raw : raw.items || [];
}

async function prefillComposer(page, text, mediaAbs) {
  const box = page.locator(S.composerBox).first();
  await box.waitFor({ state: 'visible', timeout: 30_000 });
  await box.click();
  // Typed (not pasted) so X's input handlers fire and it looks human.
  await page.keyboard.type(text, { delay: 25 });

  if (mediaAbs) {
    const input = page.locator(S.fileInput).first();
    await input.setInputFiles(mediaAbs);
    // Give X time to upload/process (esp. video) before the human sends.
    console.log('   ⏳ medya yükleniyor...');
    await page.waitForTimeout(4000);
  }
}

async function openPost(page, item) {
  await page.goto('https://x.com/compose/post', { waitUntil: 'domcontentloaded' });
  await prefillComposer(page, item.text, resolveMedia(item.media));
}

async function openReply(page, item) {
  let url = item.tweetUrl;
  if (!url && item.handle) {
    // Resolve the target's latest non-pinned tweet.
    await page.goto(`https://x.com/${item.handle}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    const articles = await page.locator(S.tweet).all();
    for (const art of articles) {
      const pinned = await art.locator(S.socialContext).first().innerText().catch(() => '');
      if (/pinned/i.test(pinned || '')) continue;
      const href = await art.locator(S.statusLink).first().getAttribute('href').catch(() => null);
      if (href && /\/status\/\d+/.test(href)) { url = `https://x.com${href}`; break; }
    }
  }
  if (!url) throw new Error(`reply hedefi çözülemedi (handle=${item.handle})`);

  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  // Click the reply ICON to OPEN the inline composer (this is NOT the send button).
  await page.locator(S.replyIcon).first().click();
  await prefillComposer(page, item.text, resolveMedia(item.media));
}

const queue = loadQueue();
console.log(`[campaign] ${queue.length} item yüklendi. Profil="${process.env.X_PROFILE || 'test'}"`);
console.log('[campaign] Her item prefill edilecek; Post/Reply\'a SEN tıkla. Enter=sıradaki, s=atla, q=çık.\n');

const { context, page } = await launchX();

try {
  // Guard: logged in?
  await page.goto('https://x.com/home', { waitUntil: 'domcontentloaded' });
  const loggedIn = await isLoggedIn(page);
  if (!loggedIn) {
    console.error('✗ Oturum yok. Önce: npm run x:login');
    process.exitCode = 1;
  } else {
    let done = 0;
    for (let i = 0; i < queue.length; i++) {
      const item = queue[i];
      const label = item.kind === 'reply' ? `reply → @${item.handle || '?'}` : 'post';
      console.log(`\n──── [${i + 1}/${queue.length}] ${label} ────`);
      if (item.note) console.log(`note: ${item.note}`);

      try {
        if (item.kind === 'reply') await openReply(page, item);
        else await openPost(page, item);

        console.log(`\nMetin:\n${item.text}\n`);
        if (item.media) console.log(`medya: ${item.media}${resolveMedia(item.media) ? '' : '  ⚠ bulunamadı'}`);
      } catch (err) {
        console.error(`✗ Bu item açılamadı: ${err.message?.split('\n')[0]}`);
        const a = await ask('Enter=sıradaki, q=çık: ');
        if (a.toLowerCase() === 'q') break;
        continue;
      }

      const a = await ask('>>> İncele, Post/Reply\'a KENDİN tıkla. Enter=sıradaki, s=atla, q=çık: ');
      if (a.toLowerCase() === 'q') break;
      if (a.toLowerCase() !== 's') done += 1;
    }
    console.log(`\n✓ Kampanya bitti. ${done} item gözden geçirildi.`);
  }
} catch (err) {
  console.error('✗ Campaign hatası:', err.message?.split('\n')[0]);
  process.exitCode = 1;
} finally {
  await context.close();
}
