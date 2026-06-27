// Stage 1 — Login.
// Opens an isolated, persistent browser profile and waits for you to log in to
// X MANUALLY (you handle password / 2FA / captcha). Once logged in, the session
// is saved to the profile dir and reused by the analyze + campaign stages.
//
//   $env:NODE_OPTIONS='--use-system-ca'; $env:X_PROFILE='test'; npm run x:login
//
// Use X_PROFILE='test' to rehearse on a throwaway account, then X_PROFILE='main'
// for @gl1tchbased (separate isolated profile, separate manual login).
import path from 'node:path';
import { launchX } from './lib/launch.mjs';
import { S } from './lib/selectors.mjs';
import { OUT_DIR, PROFILE_NAME } from './lib/paths.mjs';

const LOGIN_TIMEOUT_MS = 300_000; // 5 min — generous, for 2FA / captcha.

const { context, page } = await launchX();

try {
  await page.goto('https://x.com/home', { waitUntil: 'domcontentloaded' });

  // Already logged in from a previous run?
  const already = await page.locator(S.composeButton).isVisible().catch(() => false);
  if (already) {
    console.log(`\n✓ Already logged in (profile "${PROFILE_NAME}"). Nothing to do.`);
  } else {
    console.log('\n──────────────────────────────────────────────');
    console.log('  TARAYICIDA MANUEL GİRİŞ YAP.');
    console.log('  Şifre / 2FA / captcha — hepsi senin elinde.');
    console.log(`  Profil: "${PROFILE_NAME}"  (giriş bu profile kaydedilir)`);
    console.log('  Giriş algılanınca otomatik devam edecek...');
    console.log('──────────────────────────────────────────────\n');

    await page.locator(S.composeButton).waitFor({ state: 'visible', timeout: LOGIN_TIMEOUT_MS });
    console.log('✓ Giriş algılandı.');
  }

  const shot = path.join(OUT_DIR, `login-confirmed-${PROFILE_NAME}.png`);
  await page.screenshot({ path: shot });
  console.log(`✓ Oturum kaydedildi. Screenshot: ${shot}`);
} catch (err) {
  console.error('\n✗ Login bekleme zaman aşımına uğradı veya hata:', err.message?.split('\n')[0]);
  console.error('  Tekrar dene: npm run x:login (aynı profil, kaldığın yerden).');
  process.exitCode = 1;
} finally {
  // Persistent context flushes the session to disk on close.
  await context.close();
}
