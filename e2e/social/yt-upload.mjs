// YouTube Shorts uploader (Playwright, human-in-the-loop login).
// You log in once in the window; the script then drives the Studio upload flow:
// pick file → title/description → not-for-kids → Next×3 → Public → Publish.
//   NODE_OPTIONS=--use-system-ca node e2e/social/yt-upload.mjs
import path from "node:path";
import fs from "node:fs";
import { launch, waitForLogin, shot, REPO, OUT } from "./lib/launch.mjs";

const PRESETS = {
  verify: {
    video: "gl1tch-verify-us.mp4",
    title: "Don't trust us — verify us. We scan $GL1TCH live 🛡 #Shorts",
    desc: `Every meme coin says "trust us," then rugs you. GL1TCH hands you the receipts instead. We built the rug-scanner — so we run it on ourselves, live:
$GL1TCH = LOW RISK. Mint authority revoked · freeze revoked · 0% tax · liquidity 100% locked/burned · metadata immutable · 0% insiders · RugCheck score 1.

We're anonymous — but the code is open and every wallet is public. Don't take our word: verify each claim yourself on Solscan, RugCheck & GitHub.

🛡 Proof page: https://coin-three-mu.vercel.app/proof
💬 /proof in Telegram: https://t.me/gl1tch_infected

#crypto #memecoin #solana #rugpull #cryptoscanner #web3 #AI #Shorts`,
  },
  wallet: {
    video: "gl1tch-wallet-watch.mp4",
    title: "Get pinged when a whale or dev sells — GL1TCH Wallet Watch 🐋 #Shorts",
    desc: `GL1TCH can now watch any Solana WALLET — a whale, a token's dev, or your own bag. How it works:
1) /watchwallet <address> — point it at any wallet (read-only, never touches funds)
2) it snapshots every holding as a baseline
3) it re-checks every 3 hours — flags any position that dropped ≥25%
4) it pings you the second smart money sells — before the chart moves

🐋 Hold $GL1TCH, watch MORE wallets: free 3 → Infected 10 → Bearer 25 → Core 50 → Ghost 200. Your rank = your watch slots (/verify).

💬 /watchwallet in Telegram: https://t.me/gl1tch_infected
🔍 Scanner: https://coin-three-mu.vercel.app/scan

#crypto #memecoin #solana #whalealert #rugpull #cryptoscanner #web3 #AI #Shorts`,
  },
  mascot: {
    video: "gl1tch-lore-origin.mp4",
    title: "GL1TCH — the rogue AI that protects your bag 👻 #Shorts",
    desc: `Meet GL1TCH — a rogue-AI meme on Solana with a FREE, non-custodial token scanner.
Scan any coin on any chain: honeypot, LP lock, mint/freeze, tax, holders — explained in plain English. It reads the chain; it never touches your wallet.

🔍 Scanner: https://coin-three-mu.vercel.app/scan
💬 Telegram: https://t.me/gl1tch_infected

#crypto #memecoin #solana #cryptoscanner #rugpull #web3 #AI #Shorts`,
  },
  v3: {
    video: "gl1tch-scanner-upgraded.mp4",
    title: "GL1TCH Scanner leveled up — AI verdict + whale intel 🤖 #Shorts",
    desc: `The GL1TCH Scanner v3 is live. Others run checks — GL1TCH investigates:
🤖 AI verdict — it reads the chain and tells you straight, in its own words
🐋 Degen intel — insiders, bundled wallets & fake liquidity exposed
🛡 Verified — real blue-chips flagged, impostor clones caught, correct price any chain
📡 Shareable — every scan gets a branded card + an embeddable badge

Free · non-custodial · any chain.
🔍 https://coin-three-mu.vercel.app/scan
💬 https://t.me/gl1tch_infected

#crypto #memecoin #solana #rugpull #cryptoscanner #web3 #AI #Shorts`,
  },
  wtguide: {
    video: "gl1tch-watchtower-howto.mp4",
    title: "How GL1TCH Watchtower works — warned before the rug 👁 #Shorts",
    desc: `Watchtower watches your tokens 24/7. How it works:
1) /watch a token — it locks today's scan as a baseline.
2) it re-scans every 3 hours, automatically.
3) it catches any drop — LP unlocked, an authority returns, verdict falls.
4) it pings you — before the chart even moves.

🔍 Scan: https://coin-three-mu.vercel.app/scan
💬 /watch in Telegram: https://t.me/gl1tch_infected

#crypto #memecoin #solana #rugpull #cryptoscanner #web3 #AI #Shorts`,
  },
  multichain: {
    video: "gl1tch-multichain.mp4",
    title: "6 Chains, 1 Scanner — check ANY token, any chain 🔍 #Shorts",
    desc: `Most rug-checkers only work on one chain. GL1TCH reads them all — Solana, Ethereum, Base, BNB, Arbitrum, Polygon, Optimism, Avalanche + more. Same plain-English verdict everywhere: honeypot, LP lock, mint/freeze, tax, holders.

🔍 Scan: https://coin-three-mu.vercel.app/scan
💬 Telegram: https://t.me/gl1tch_infected

#crypto #memecoin #solana #ethereum #cryptoscanner #rugpull #web3 #Shorts`,
  },
  anatomy: {
    video: "gl1tch-anatomy.mp4",
    title: "Anatomy of a Rug — caught in 5 seconds 🔍 #Shorts",
    desc: `It 100x'd in a day. Then it went to zero. The traps were there the whole time — unlocked liquidity, a live mint authority, a 61% whale wallet. GL1TCH reads all of it in 5 seconds, before you ape.

🔍 Scan any token: https://coin-three-mu.vercel.app/scan
💬 Telegram: https://t.me/gl1tch_infected

#crypto #memecoin #solana #rugpull #cryptoscanner #web3 #AI #Shorts`,
  },
  reel: {
    video: "gl1tch-reel.mp4",
    title: "GL1TCH — the rogue AI that reads every rug 👻🔍 #Shorts",
    desc: `There's a glitch in the machine. GL1TCH is a rogue-AI meme on Solana that does one genuinely useful thing — it reads any token on any chain and flags the rug before you ape. Free, non-custodial.

🔍 Scanner: https://coin-three-mu.vercel.app/scan
💬 Telegram: https://t.me/gl1tch_infected

#crypto #memecoin #solana #rugpull #cryptoscanner #web3 #AI #glitch #Shorts`,
  },
  watchtower: {
    video: "gl1tch-watchtower2.mp4",
    title: "Your coin rugged at 3am. You slept. GL1TCH didn't. 👁 #Shorts",
    desc: `Your bag was fine at midnight — by 3am it was a rug. You were asleep. GL1TCH wasn't.
/watch any token and the rogue AI keeps re-scanning it. The moment its safety drops — LP unlocked, an authority returns, verdict falls — it pings you. Before the chart even moves.

🔍 Scanner: https://coin-three-mu.vercel.app/scan
💬 Telegram: https://t.me/gl1tch_infected

#crypto #memecoin #solana #rugpull #cryptoscanner #web3 #AI #Shorts`,
  },
};
const P = PRESETS[process.env.POST || "mascot"] || PRESETS.mascot;
const VIDEO = path.resolve(REPO, "pump-pack", "videos", "branded", P.video);
const TITLE = P.title;
const DESC = P.desc;

if (!fs.existsSync(VIDEO)) { console.error("[yt] video missing:", VIDEO); process.exit(2); }

const { context, page } = await launch("youtube");

await page.goto("https://www.youtube.com/", { waitUntil: "domcontentloaded" }).catch(() => {});
await page.waitForTimeout(3000);

// Logged in when the account avatar is present and we're not on a Google sign-in page.
const loggedIn = await waitForLogin(
  page,
  async (p) =>
    !/accounts\.google\.com/i.test(p.url()) &&
    (await p.locator('#avatar-btn, button#avatar-btn, ytd-topbar-menu-button-renderer #avatar-btn, ytcp-app').count()) > 0,
  "YouTube",
  12 * 60_000
);
if (!loggedIn) { console.error("[yt] login timeout"); await shot(page, "yt-login-timeout.png"); await context.close(); process.exit(2); }

// Open Studio, then drive Create → Upload videos (navigating to /upload directly
// just bounces to the channel page in this Studio build).
await page.goto("https://studio.youtube.com", { waitUntil: "domcontentloaded" }).catch(() => {});
await page.waitForTimeout(5000);
await shot(page, "yt-0-studio.png");

// Create menu (TR: "Oluştur", EN: "Create").
await page.getByRole("button", { name: /Oluştur|Create/i }).first().click({ timeout: 25_000 }).catch(async () => {
  await page.locator("#create-icon, ytcp-button#create-icon").first().click({ timeout: 8000 }).catch(() => console.log("[yt] create button missed"));
});
await page.waitForTimeout(1500);
// Upload videos (TR: "Video yükle", EN: "Upload videos").
await page.getByText(/Video yükle|Upload videos/i).first().click({ timeout: 8000 }).catch(async () => {
  await page.locator('#text-item-0, tp-yt-paper-item').first().click({ timeout: 8000 }).catch(() => console.log("[yt] upload-videos item missed"));
});
await page.waitForTimeout(2500);
await shot(page, "yt-1-upload-open.png");

// Attach the file (the dialog exposes a hidden file input).
const fileInput = page.locator('input[type="file"]').first();
await fileInput.waitFor({ state: "attached", timeout: 30_000 });
await fileInput.setInputFiles(VIDEO);
console.log("[yt] file set, waiting for details dialog…");

// Details dialog. Title/desc boxes have stable ids (language-agnostic).
const title = page.locator('#title-textarea #textbox, ytcp-social-suggestions-textbox#title-textarea #textbox').first();
await title.waitFor({ state: "visible", timeout: 90_000 });
await page.waitForTimeout(2500);
await shot(page, "yt-2-details.png");

await title.click();
await page.keyboard.press("Control+A");
await page.keyboard.press("Delete");
await title.type(TITLE.slice(0, 99), { delay: 8 });
const desc = page.locator('#description-textarea #textbox, ytcp-social-suggestions-textbox#description-textarea #textbox').first();
if (await desc.count()) { await desc.click().catch(() => {}); await desc.type(DESC, { delay: 4 }).catch(() => {}); }
await page.waitForTimeout(800);

// Audience: "No, it's not made for kids".
const notForKids = page.locator('tp-yt-paper-radio-button[name="VIDEO_MADE_FOR_KIDS_NOT_MFK"], #audience [name="VIDEO_MADE_FOR_KIDS_NOT_MFK"]').first();
await notForKids.click({ timeout: 10_000 }).catch(() => console.log("[yt] not-for-kids radio not found (continuing)"));
await page.waitForTimeout(600);
await shot(page, "yt-3-filled.png");

// Next × 3 (Details → Video elements → Checks → Visibility).
for (let i = 0; i < 3; i++) {
  const next = page.locator("#next-button").first();
  await next.click({ timeout: 15_000 }).catch(() => console.log(`[yt] next ${i + 1} click missed`));
  await page.waitForTimeout(1800);
}
await shot(page, "yt-4-visibility.png");

// Public.
const pub = page.locator('tp-yt-paper-radio-button[name="PUBLIC"], #privacy-radios [name="PUBLIC"]').first();
await pub.click({ timeout: 10_000 }).catch(() => console.log("[yt] public radio not found"));
await page.waitForTimeout(800);

// Publish.
const done = page.locator("#done-button").first();
await done.click({ timeout: 15_000 }).catch(() => console.log("[yt] done button missed"));
await page.waitForTimeout(4000);

// CRITICAL: the file may still be UPLOADING after Publish. Closing the tab mid-
// upload aborts it. Wait until the upload-progress text is gone (or the share
// dialog appears) before we close — up to ~7 min for big files.
for (let i = 0; i < 140; i++) {
  const uploading = await page.getByText(/saniye kaldı|seconds left|Yükleme yüzdesi|uploading|% ?\d+.*(kaldı|left)/i).count().catch(() => 0);
  const shareReady = await page.locator("#share-url, ytcp-video-share-dialog").count().catch(() => 0);
  if (shareReady > 0 || uploading === 0) { console.log(`[yt] upload settled (share=${shareReady}, uploading=${uploading})`); break; }
  if (i % 5 === 0) console.log(`[yt] still uploading… (${i * 3}s)`);
  await page.waitForTimeout(3000);
}
await page.waitForTimeout(2000);
await shot(page, "yt-5-published.png");

// Success heuristic: a share/processing dialog appears, or the upload-complete /
// processing text is shown (TR + EN).
const ok = (await page.locator('ytcp-video-share-dialog, #share-url, tp-yt-paper-dialog:has-text("published")').count()) > 0
  || (await page.getByText(/Yükleme tamamlandı|Upload complete|işleniyor|processing|Kontroller tamamlandı|Checks complete/i).count().catch(() => 0)) > 0;
let url = "";
try { url = await page.locator("#share-url, a#share-url").first().inputValue({ timeout: 2000 }).catch(async () => await page.locator("#share-url").first().innerText().catch(() => "")); } catch { /* */ }
fs.writeFileSync(path.resolve(OUT, "yt-result.txt"), `${ok ? "PUBLISHED" : "UNCONFIRMED"} ${url}\n`);
console.log(ok ? `[yt] ✅ PUBLISHED ${url}` : "[yt] ⚠️ could not confirm — see yt-5-published.png");

await page.waitForTimeout(3000);
await context.close();
process.exit(0);
