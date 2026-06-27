// Persistent-context launcher for the Higgsfield web automation.
// Mirrors the X harness (e2e/x/lib/launch.mjs): one isolated profile dir so the
// Higgsfield login survives across runs, real Chrome preferred (lower automation
// fingerprint), bundled Chromium fallback. This drives YOUR OWN logged-in account
// + unlimited plan via the web UI — credits aren't billed the way the MCP/API is.
import { chromium } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const HF_DIR = path.resolve(__dirname, '..');
export const REPO_ROOT = path.resolve(HF_DIR, '..', '..');
export const OUT_DIR = path.resolve(HF_DIR, 'out');
export const PROFILE_NAME = process.env.HF_PROFILE || 'main';
export const PROFILE_DIR = path.resolve(HF_DIR, '.profiles', PROFILE_NAME);
export const VIDEOS_DIR = path.resolve(REPO_ROOT, 'pump-pack', 'videos');

export function ensureDirs() {
  for (const d of [OUT_DIR, PROFILE_DIR, VIDEOS_DIR]) fs.mkdirSync(d, { recursive: true });
}

const BASE_OPTS = {
  headless: false,
  viewport: { width: 1440, height: 900 },
  locale: 'en-US',
  timezoneId: 'Europe/Istanbul',
  slowMo: 120,
  acceptDownloads: true,
  args: ['--disable-blink-features=AutomationControlled'],
};

export async function launchHF() {
  ensureDirs();
  let context, channel = 'chrome';
  try {
    context = await chromium.launchPersistentContext(PROFILE_DIR, { ...BASE_OPTS, channel: 'chrome' });
  } catch (err) {
    console.warn(`[launch] Chrome unavailable (${err.message?.split('\n')[0]}). Falling back to Chromium.`);
    context = await chromium.launchPersistentContext(PROFILE_DIR, BASE_OPTS);
    channel = 'chromium';
  }
  const page = context.pages()[0] ?? (await context.newPage());
  console.log(`[launch] profile="${PROFILE_NAME}" browser=${channel}\n  ${PROFILE_DIR}`);
  return { context, page, channel };
}
