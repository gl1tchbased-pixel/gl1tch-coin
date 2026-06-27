// Shared login-state check. X is a client-rendered SPA, so right after a
// domcontentloaded navigation the nav isn't in the DOM yet — an immediate
// isVisible() check races and falsely reports "logged out". This waits for the
// logged-in-only compose button to appear before deciding.
import { S } from './selectors.mjs';

/**
 * @param {import('@playwright/test').Page} page
 * @param {number} timeoutMs
 * @returns {Promise<boolean>}
 */
export async function isLoggedIn(page, timeoutMs = 20_000) {
  // Ensure we're on X before checking — callers may pass a fresh about:blank page.
  if (!/(^https?:\/\/(x|twitter)\.com)/.test(page.url())) {
    await page.goto('https://x.com/home', { waitUntil: 'domcontentloaded' }).catch(() => {});
  }
  return page
    .locator(S.composeButton)
    .first()
    .waitFor({ state: 'visible', timeout: timeoutMs })
    .then(() => true)
    .catch(() => false);
}
