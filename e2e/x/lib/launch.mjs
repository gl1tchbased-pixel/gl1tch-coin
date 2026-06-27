// Persistent-context launcher for the human-in-the-loop X workflow.
// One isolated profile dir per X_PROFILE (test / main) so sessions survive runs
// and never mix accounts. Prefers real Google Chrome (lower automation
// fingerprint); falls back to the bundled Chromium if Chrome isn't installed.
import { chromium } from '@playwright/test';
import { PROFILE_DIR, PROFILE_NAME, ensureDirs } from './paths.mjs';

const BASE_OPTS = {
  headless: false,
  viewport: { width: 1280, height: 800 },
  locale: 'en-US',
  timezoneId: 'Europe/Istanbul',
  slowMo: 120, // human pace
  args: [
    // Drops the "Chrome is being controlled by automated software" banner and
    // lowers the navigator.webdriver signal. This is the one low-brittleness
    // tweak — no heavy stealth monkey-patching (brittle + itself a signal).
    '--disable-blink-features=AutomationControlled',
  ],
  // Intentionally NOT setting a custom userAgent — a mismatched UA is a bigger
  // red flag than Chrome's real one.
};

/**
 * Launch (or reattach to) the persistent X browser context.
 * @returns {Promise<{context: import('@playwright/test').BrowserContext, page: import('@playwright/test').Page, channel: string}>}
 */
export async function launchX() {
  ensureDirs();

  let context;
  let channel = 'chrome';
  try {
    context = await chromium.launchPersistentContext(PROFILE_DIR, { ...BASE_OPTS, channel: 'chrome' });
  } catch (err) {
    console.warn(`[launch] Google Chrome unavailable (${err.message?.split('\n')[0]}). Falling back to bundled Chromium.`);
    context = await chromium.launchPersistentContext(PROFILE_DIR, BASE_OPTS);
    channel = 'chromium';
  }

  const page = context.pages()[0] ?? (await context.newPage());
  console.log(`[launch] profile="${PROFILE_NAME}" browser=${channel} (${PROFILE_DIR})`);
  return { context, page, channel };
}
