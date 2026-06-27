// Persistent-context launcher for the human-in-the-loop social uploaders
// (YouTube, Instagram). One isolated profile dir per platform so logins persist
// across runs. Prefers real Chrome (lower automation fingerprint).
import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DIR = path.dirname(fileURLToPath(import.meta.url));
export const REPO = path.resolve(DIR, "..", "..", "..");
const PROFILES = path.resolve(DIR, "..", ".profiles");
export const OUT = path.resolve(DIR, "..", "out");

const BASE = {
  headless: false,
  viewport: null, // use the real window size (we maximize it)
  locale: "en-US",
  timezoneId: "Europe/Istanbul",
  slowMo: 90,
  args: [
    "--disable-blink-features=AutomationControlled",
    "--start-maximized", // make the window big & obvious so it isn't missed
    "--new-window",
  ],
};

export async function launch(profileName) {
  const profileDir = path.resolve(PROFILES, profileName);
  fs.mkdirSync(profileDir, { recursive: true });
  fs.mkdirSync(OUT, { recursive: true });
  // Clear a stale single-process lock from a previous run that didn't close cleanly,
  // otherwise the new window can open detached/invisible.
  for (const lock of ["SingletonLock", "SingletonCookie", "SingletonSocket"]) {
    try { fs.rmSync(path.resolve(profileDir, lock), { force: true }); } catch { /* */ }
  }
  let context, channel = "chrome";
  try {
    context = await chromium.launchPersistentContext(profileDir, { ...BASE, channel: "chrome" });
  } catch {
    channel = "chromium";
    context = await chromium.launchPersistentContext(profileDir, BASE);
  }
  const page = context.pages()[0] ?? (await context.newPage());
  await page.bringToFront().catch(() => {});
  console.log(`[launch] profile=${profileName} browser=${channel} — a MAXIMIZED window should now be open (${profileDir})`);
  return { context, page };
}

/** Poll until `check(page)` resolves truthy (login complete), up to timeoutMs. */
export async function waitForLogin(page, check, label, timeoutMs = 8 * 60_000) {
  console.log(`[login] waiting for ${label} login in the browser window…`);
  const deadline = Number.MAX_SAFE_INTEGER; // wall-clock not used in workflows; this is a plain script
  void deadline;
  for (let i = 0; i < Math.ceil(timeoutMs / 3000); i++) {
    if (await check(page).catch(() => false)) { console.log(`[login] ${label} ready.`); return true; }
    await page.waitForTimeout(3000);
    if (i % 5 === 0) console.log(`[login] still waiting for ${label}… (${i * 3}s)`);
  }
  return false;
}

export const shot = (page, name) =>
  page.screenshot({ path: path.resolve(OUT, name) }).catch(() => {});
