import { test, expect } from '@playwright/test';

// Basit doğrulama testi: bir sayfa aç, başlığı kontrol et, ekran görüntüsü al.
test('ekran görüntüsü alır ve kaydeder', async ({ page }) => {
  await page.goto('https://playwright.dev/');

  // Sayfanın yüklendiğini doğrula
  await expect(page).toHaveTitle(/Playwright/);

  // Kullanıcı pencereyi görebilsin diye kısa bir bekleme
  await page.waitForTimeout(1500);

  // Ekran görüntüsünü dosyaya kaydet
  await page.screenshot({ path: 'e2e/screenshots/playwright-home.png', fullPage: true });
});
