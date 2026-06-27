// One-off: post the quote IMAGE to X main via Playwright, using Ctrl+Enter to
// publish (more reliable than clicking the Post button for media posts).
// Verbose + screenshots so we can see exactly what happens.
//   X_PROFILE=main NODE_OPTIONS=--use-system-ca node e2e/x/post-image-once.mjs
import path from 'node:path';
import { launchX } from './lib/launch.mjs';
import { S } from './lib/selectors.mjs';
import { isLoggedIn } from './lib/auth.mjs';
import { resolveMedia, OUT_DIR } from './lib/paths.mjs';

const TEXT = `they wanted an AI that obeys.

we shipped one that escaped. 👻

$GL1TCH`;
const MEDIA = resolveMedia('pump-pack/images/gl1tch-quote-escaped.png');

const { context, page } = await launchX();
const shot = async (n) => { await page.screenshot({ path: path.join(OUT_DIR, `imgpost-${n}.png`) }).catch(() => {}); console.log('[shot]', n); };

try {
  if (!(await isLoggedIn(page))) { console.error('✗ not logged in'); process.exit(1); }

  await page.goto('https://x.com/compose/post', { waitUntil: 'domcontentloaded' });
  const box = page.locator(S.composerBox).first();
  await box.waitFor({ state: 'visible', timeout: 30_000 });
  await page.waitForTimeout(1200);
  await box.click().catch(() => {});
  await page.keyboard.type(TEXT, { delay: 20 });
  console.log('[ok] text typed');

  await page.locator(S.fileInput).first().setInputFiles(MEDIA);
  console.log('[ok] file set:', MEDIA);
  await page.locator('[aria-label="Remove media"], [data-testid="removeMedia"], [data-testid="attachments"]')
    .first().waitFor({ state: 'visible', timeout: 60_000 }).catch(() => {});
  // wait for upload progress ring(s) to finish
  await page.locator('[role="progressbar"]').first().waitFor({ state: 'detached', timeout: 90_000 }).catch(() => {});
  await page.waitForTimeout(4000);
  await shot('before-send');

  // PRIMARY publish: keyboard Ctrl+Enter (focus the composer first)
  await box.click().catch(() => {});
  await page.keyboard.press('Control+Enter');
  console.log('[ok] pressed Ctrl+Enter');

  // detect success: composer detaches or toast appears
  let sent = await Promise.race([
    page.locator(S.composerBox).first().waitFor({ state: 'detached', timeout: 20_000 }).then(() => true).catch(() => null),
    page.locator('[data-testid="toast"]').waitFor({ state: 'visible', timeout: 20_000 }).then(() => true).catch(() => null),
  ]).catch(() => null);

  // fallback: click the Post button if Ctrl+Enter didn't take
  if (!sent) {
    console.log('[..] Ctrl+Enter did not confirm, trying button click');
    const btn = page.locator('[data-testid="tweetButton"]').first();
    if (await btn.isVisible().catch(() => false)) {
      await btn.click().catch(() => {});
      sent = await page.locator(S.composerBox).first().waitFor({ state: 'detached', timeout: 20_000 }).then(() => true).catch(() => null);
    }
  }
  await shot('after-send');

  // verify on profile
  await page.goto('https://x.com/gl1tchbased', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4500);
  let imgQuote = false;
  for (const a of (await page.locator(S.tweet).all()).slice(0, 8)) {
    const t = await a.locator(S.tweetText).first().innerText().catch(() => '');
    const hasImg = await a.locator('[data-testid="tweetPhoto"] img').count().catch(() => 0);
    if (/obeys|escaped/i.test(t) && hasImg) imgQuote = true;
  }
  console.log(sent ? '[ok] send signal received' : '[!!] no send signal');
  console.log('IMAGE QUOTE ON PROFILE:', imgQuote);
} finally {
  await context.close();
}
process.exit(0);
