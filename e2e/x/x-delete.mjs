// Delete own tweets that match a text snippet. Used to remove posts that went out
// with a wrong link so a corrected version can be reposted.
//   $env:X_PROFILE='main'; $env:NODE_OPTIONS='--use-system-ca'; node e2e/x/x-delete.mjs --match "not your average meme" --match "materializing in the machine"
import path from 'node:path';
import { launchX } from './lib/launch.mjs';
import { S } from './lib/selectors.mjs';
import { isLoggedIn } from './lib/auth.mjs';
import { OUT_DIR, X_HANDLE } from './lib/paths.mjs';

const args = process.argv.slice(2);
const matches = args.reduce((a, v, i) => (v === '--match' && args[i + 1] ? [...a, args[i + 1]] : a), []);
if (!matches.length) { console.error('Kullanım: node e2e/x/x-delete.mjs --match "snippet" [--match "..."]'); process.exit(1); }

const { context, page } = await launchX();
try {
  if (!(await isLoggedIn(page))) { console.error('✗ Oturum yok. Önce: npm run x:login'); process.exitCode = 1; }
  else {
    for (const snippet of matches) {
      console.log(`\n[delete] aranıyor: "${snippet}"`);
      await page.goto(`https://x.com/${X_HANDLE}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2500);
      let done = false;
      for (let scroll = 0; scroll < 6 && !done; scroll++) {
        for (const art of await page.locator(S.tweet).all()) {
          const txt = await art.locator(S.tweetText).first().innerText().catch(() => '');
          if (!txt || !txt.toLowerCase().includes(snippet.toLowerCase())) continue;
          // open the tweet's "..." menu
          await art.locator('[data-testid="caret"]').first().click().catch(() => {});
          await page.waitForTimeout(800);
          const del = page.getByRole('menuitem', { name: /^delete$/i });
          if (!(await del.first().isVisible().catch(() => false))) {
            console.log('[delete] menüde Delete yok (senin tweet değil?) — atlanıyor'); await page.keyboard.press('Escape').catch(() => {}); continue;
          }
          await del.first().click().catch(() => {});
          await page.waitForTimeout(700);
          await page.locator('[data-testid="confirmationSheetConfirm"]').first().click().catch(() => {});
          await page.waitForTimeout(1500);
          console.log(`[delete] ✓ silindi: "${snippet}"`);
          done = true; break;
        }
        if (!done) { await page.mouse.wheel(0, 1800); await page.waitForTimeout(1200); }
      }
      if (!done) console.log(`[delete] ✗ bulunamadı: "${snippet}"`);
    }
    await page.screenshot({ path: path.join(OUT_DIR, 'x-delete-done.png') }).catch(() => {});
  }
} finally {
  await context.close();
}
