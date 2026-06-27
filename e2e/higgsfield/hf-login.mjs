// Step 1 — manual login. Opens higgsfield.ai in the persistent profile and waits
// for you to sign in by hand IN THE WINDOW THIS SCRIPT OPENS (not your normal
// Chrome). After you press Enter it verifies the session actually took — if the
// "Login / Sign up" buttons are still showing, it tells you you're NOT logged in.
//   HF_PROFILE=main NODE_OPTIONS=--use-system-ca node e2e/higgsfield/hf-login.mjs
import readline from 'node:readline';
import { launchHF } from './lib/launch.mjs';

// Logged-OUT pages show visible "Log in" / "Sign up" buttons; logged-in pages
// don't. Use that as the auth signal.
export async function isLoggedIn(page) {
  await page.goto('https://higgsfield.ai/ai-video', { waitUntil: 'domcontentloaded' }).catch(() => {});
  await page.waitForTimeout(3000);
  const loginBtn = page.getByRole('button', { name: /^(log ?in|sign ?up)$/i });
  const link = page.getByRole('link', { name: /^(log ?in|sign ?up)$/i });
  const loggedOut = (await loginBtn.count()) > 0 || (await link.count()) > 0;
  return !loggedOut;
}

const { context, page } = await launchHF();
await page.goto('https://higgsfield.ai/', { waitUntil: 'domcontentloaded' }).catch(() => {});

console.log('\n[hf-login] A browser window is open — THIS one, not your normal Chrome.');
console.log('[hf-login] Click "Log in", sign in with Google INSIDE this window.');
console.log('[hf-login] When your account/credits show in the top-right, return here and press Enter.\n');

await new Promise((resolve) => {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl.question('Press Enter once you are fully logged in… ', () => { rl.close(); resolve(); });
});

const ok = await isLoggedIn(page);
if (ok) {
  console.log('\n[hf-login] ✅ LOGGED IN — session saved to the profile. You can close the window.');
} else {
  console.log('\n[hf-login] ❌ STILL LOGGED OUT — the page still shows Login/Sign up.');
  console.log('[hf-login] You likely signed in on a different window, or Google blocked the');
  console.log('[hf-login] automation browser ("this browser may not be secure").');
  console.log('[hf-login] Tell Claude — we will switch to importing your real Chrome session.');
}
await context.close();
process.exit(ok ? 0 : 1);
