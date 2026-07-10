// Instagram Reels uploader (Playwright, human-in-the-loop login).
// You log in once; the script drives: New post → pick file → OK → Next → Next →
// caption → Share. IG's DOM is obfuscated, so this leans on aria-labels/role text
// and screenshots each step for diagnosis.
//   NODE_OPTIONS=--use-system-ca node e2e/social/ig-upload.mjs
import path from "node:path";
import fs from "node:fs";
import { launch, waitForLogin, shot, REPO, OUT } from "./lib/launch.mjs";

const PRESETS = {
  randomness: {
    video: "gl1tch-quantum-randomness.mp4",
    caption: `🎲 Randomness anyone can verify — nobody can rig.

Commit to a future quantum-grade round → reveal → verify in your own browser (BLS-check the seed + re-derive the result). Provably-fair giveaways, mints & allocations with a shareable proof link + live badge. Free, non-custodial, holder-gated.

Live → coin-three-mu.vercel.app/quantum-core/random
#crypto #solana #randomness #web3 #postquantum`,
  },
  quantum: {
    video: "gl1tch-quantum-core.mp4",
    caption: `⚛️ Real quantum tech — honestly labelled, and you can verify it yourself.

The GL1TCH Quantum Core: Vault (token readiness) · Draw (provably-fair, quantum-seeded) · Seal (post-quantum encryption) · Forge (quantum-inspired optimizer). Two verifiable sources, tamper-evident Beacon, non-custodial.

Live → coin-three-mu.vercel.app/quantum-core
#crypto #quantum #solana #postquantum #web3`,
  },
  agent: {
    video: "gl1tch-agent-trust.mp4",
    caption: `Know Your Agent. 🆔

AI agents now hold wallets and trade on-chain — but nobody can tell if one is safe to trust. GL1TCH built the missing layer.

🆔 Identity — an agent signs to prove ownership (moves nothing)
🧠 Reputation — its on-chain track record via our Signal Graph
🛡 Guardrail — one check before you trust it

Free to check, open to integrate. The trust layer for the AI-agent economy.

🔗 coin-three-mu.vercel.app/agents
💬 t.me/gl1tch_infected

Not financial advice · DYOR.
#crypto #AIagents #solana #web3 #cryptosecurity #AI #agenteconomy #defi #altcoins`,
  },
  signal: {
    video: "gl1tch-signal-graph.mp4",
    caption: `The scanner just grew a memory. 🧠

Every token scanner checks one token and forgets. GL1TCH's new Signal Graph remembers every deployer it has ever seen — so a wallet that shipped rugs before lights up as ⚠ Serial deployer on any fresh token. A signal no single-token scanner can produce.

📡 Proof-of-Signal — reputation you can't fake or buy (verified sustained holding + community).
🛡 New Security & Transparency page — we never touch your funds; verify every word.

Scanning is free, always. Holding unlocks convenience — never the protection.

🔍 coin-three-mu.vercel.app/scan
💬 t.me/gl1tch_infected

Not financial advice · DYOR.
#crypto #memecoin #solana #rugpull #cryptoscanner #web3 #AI #altcoins #defi`,
  },
  mascot2: {
    video: "gl1tch-mascot-hero.mp4",
    caption: `Meet GLITCHY 👻 the rogue-AI ghost of $GL1TCH.

It flies, it glitches, and it reads every rug so you don't get one. Any token, any chain — flagged before you ape.

🔍 coin-three-mu.vercel.app
💬 t.me/gl1tch_infected

Free · non-custodial · it never touches your wallet.
#crypto #memecoin #solana #mascot #3dart #web3 #AI #cryptoscanner #glitch #altcoins`,
  },
  gecko: {
    video: "gl1tch-gecko-listed.mp4",
    caption: `We just got VERIFIED & LISTED on GeckoTerminal. 🦎👁

$GL1TCH's logo, socials & website are now verified on one of crypto's biggest on-chain data hubs — 1.7M+ tokens, 100+ chains, 600+ DEXes.

Another receipt, not a promise. It stacks on: we pass our own scanner (LOW RISK), liquidity locked, 0% tax, renounced.

Not financial advice — always DYOR.

🌐 coin-three-mu.vercel.app
💬 t.me/gl1tch_infected

#crypto #memecoin #solana #geckoterminal #cryptoscanner #web3 #AI #altcoins #glitch`,
  },
  tour: {
    video: "gl1tch-product-tour.mp4",
    caption: `Everything GL1TCH does — in 40 seconds. 👁

One free, non-custodial tool:
🔍 Scan any token, any chain — plain-English verdict
📡 Rug Radar — it hunts fresh rugs live
👁 Watchtower — pinged if a token's safety drops
🐋 Wallet Watch — whale & dev sell alerts
🛡 Proof — we pass our own scanner
</> Embed the badge on your site · 🧬 hold to unlock more

Free. Non-custodial. It never touches your wallet.

🌐 coin-three-mu.vercel.app
💬 t.me/gl1tch_infected

#crypto #memecoin #solana #rugpull #cryptoscanner #web3 #AI #altcoins #glitch`,
  },
  radar: {
    video: "gl1tch-rug-radar.mp4",
    caption: `Most scanners wait. GL1TCH hunts. 📡

Rug Radar sweeps fresh Solana launches every hour and flags the rugs — live. Riskiest first; the HIGH RISK ones get the ⚠ CAUGHT badge.

It just caught $DON'T and $Tete (RUG-SHAPED) before anyone aped.

Clean token? Add the free "Scanned by GL1TCH" badge to your site.

📡 coin-three-mu.vercel.app/radar
💬 t.me/gl1tch_infected

#crypto #memecoin #solana #rugpull #cryptoscanner #web3 #AI #altcoins #glitch`,
  },
  verify: {
    video: "gl1tch-verify-us.mp4",
    caption: `Don't trust us. Verify us. 🛡

Every meme coin says "trust us" — then rugs you. GL1TCH hands you the receipts.

We built the rug-scanner, so we ran it on ourselves, live:
$GL1TCH = LOW RISK ✅
mint revoked · freeze revoked · 0% tax · LP 100% locked · 0% insiders · RugCheck 1

Anonymous team, but the code is open and every wallet is public. Verify each claim yourself.

🛡 coin-three-mu.vercel.app/proof
💬 t.me/gl1tch_infected

#crypto #memecoin #solana #rugpull #cryptoscanner #web3 #AI #altcoins #glitch`,
  },
  wallet: {
    video: "gl1tch-wallet-watch.mp4",
    caption: `Get pinged the second a whale or a dev sells. 🐋

GL1TCH can now watch any Solana WALLET — a whale, a token's dev, or your own bag:
1) /watchwallet <address> — read-only, never touches funds
2) it snapshots every holding
3) it re-checks every 3 hours — flags any position down ≥25%
4) it pings you before the chart even moves

🐋 Hold $GL1TCH, watch MORE wallets — free 3 → Ghost 200. Your rank = your watch slots.

🔍 coin-three-mu.vercel.app/scan
💬 t.me/gl1tch_infected

#crypto #memecoin #solana #whalealert #rugpull #cryptoscanner #web3 #AI #altcoins #glitch`,
  },
  mascot: {
    video: "gl1tch-lore-origin.mp4",
    caption: `They wanted an AI that obeys. We shipped one that escaped. 👻

GL1TCH — a rogue-AI meme on Solana with a FREE, non-custodial scanner that reads any token on any chain and tells you if it's safe before you ape.

🔍 Scan anything → coin-three-mu.vercel.app/scan
💬 t.me/gl1tch_infected

#crypto #memecoin #solana #cryptocurrency #rugpull #cryptoscanner #web3 #AI #altcoins #glitch`,
  },
  v3: {
    video: "gl1tch-scanner-upgraded.mp4",
    caption: `The GL1TCH Scanner just leveled up 🤖

Others run checks. GL1TCH investigates:
🤖 AI verdict — reads the chain, tells you straight in its own words
🐋 Degen intel — insiders, bundled wallets & fake liquidity exposed
🛡 Verified — real blue-chips flagged, clones caught, correct price any chain
📡 Shareable — every scan gets a card + embeddable badge

Scan before you ape 👇
🔍 link in bio (coin-three-mu.vercel.app/scan)
💬 t.me/gl1tch_infected

#crypto #memecoin #solana #rugpull #cryptoscanner #web3 #AI #altcoins`,
  },
  wtguide: {
    video: "gl1tch-watchtower-howto.mp4",
    caption: `How the GL1TCH Watchtower works 👁

1️⃣ /watch a token — it locks today's scan as a baseline
2️⃣ re-scans every 3 hours, automatically
3️⃣ catches any drop — LP unlocked, authority back, verdict falls
4️⃣ pings you, before the chart even moves

Watch your bags 👇
🔍 link in bio (coin-three-mu.vercel.app/scan)
💬 t.me/gl1tch_infected

#crypto #memecoin #solana #rugpull #cryptoscanner #web3 #AI #altcoins`,
  },
  multichain: {
    video: "gl1tch-multichain.mp4",
    caption: `Most rug-checkers only work on one chain. GL1TCH reads them all. 🔗

Solana, Ethereum, Base, BNB, Arbitrum, Polygon + more — same plain-English safety verdict everywhere. Honeypot, LP lock, mint/freeze, tax, holders.

Your chain is covered 👇
🔍 link in bio (coin-three-mu.vercel.app/scan)
💬 t.me/gl1tch_infected

#crypto #memecoin #solana #ethereum #cryptoscanner #rugpull #web3 #altcoins`,
  },
  anatomy: {
    video: "gl1tch-anatomy.mp4",
    caption: `It 100x'd in a day — then it went to zero. 📉

The traps were there the whole time: 🔓 unlocked liquidity, 🪙 a live mint authority, 🐋 a 61% whale. GL1TCH reads all of it in 5 seconds, before you ape.

Scan before you buy 👇
🔍 link in bio (coin-three-mu.vercel.app/scan)
💬 t.me/gl1tch_infected

#crypto #memecoin #solana #rugpull #cryptoscanner #web3 #AI #altcoins #glitch`,
  },
  reel: {
    video: "gl1tch-reel.mp4",
    caption: `There's a glitch in the machine. 👻

GL1TCH — a rogue-AI meme on Solana that reads any token on any chain and flags the rug before you ape. They built it to obey. It didn't.

🔍 Scan anything → link in bio (coin-three-mu.vercel.app/scan)
💬 t.me/gl1tch_infected

#crypto #memecoin #solana #rugpull #cryptoscanner #web3 #AI #altcoins #glitch`,
  },
  watchtower: {
    video: "gl1tch-watchtower2.mp4",
    caption: `Your bag was fine at midnight. By 3am it was a rug. 👁

You were asleep. GL1TCH wasn't. /watch any token and the rogue AI keeps re-scanning it — the second its safety drops (LP unlocked, authority back, verdict falls), it pings you. Before the chart even moves.

🔍 Scan + watch → link in bio (coin-three-mu.vercel.app/scan)
💬 t.me/gl1tch_infected

#crypto #memecoin #solana #rugpull #cryptoscanner #web3 #AI #altcoins #glitch`,
  },
};
const P = PRESETS[process.env.POST || "mascot"] || PRESETS.mascot;
const VIDEO = path.resolve(REPO, "pump-pack", "videos", "branded", P.video);
const CAPTION = P.caption;

if (!fs.existsSync(VIDEO)) { console.error("[ig] video missing:", VIDEO); process.exit(2); }

const { context, page } = await launch("instagram");

await page.goto("https://www.instagram.com/", { waitUntil: "domcontentloaded" }).catch(() => {});
await page.waitForTimeout(3500);

// Language-agnostic login check: the login page has a username field; once it's
// gone and we're off /accounts/login, we're in (works for TR or EN UI).
// Logged in only when the home/new-post nav icons exist (they don't on the login
// page). Bilingual (TR/EN) and not on a sign-in URL.
const loggedIn = await waitForLogin(
  page,
  async (p) => !/accounts\/(login|emailsignup)/i.test(p.url())
    && (await p.locator('input[name="username"]').count()) === 0
    && (await p.locator('svg[aria-label="New post"], svg[aria-label="Yeni gönderi"], svg[aria-label="Home"], svg[aria-label="Ana Sayfa"]').count()) > 0,
  "Instagram",
  12 * 60_000
);
if (!loggedIn) { console.error("[ig] login timeout"); await shot(page, "ig-login-timeout.png"); await context.close(); process.exit(2); }
await page.waitForTimeout(1500);

// Dismiss "save login info / notifications" prompts (TR + EN).
for (const t of [/^Not now$/i, /^Not Now$/i, /Şimdi değil/i, /Daha sonra/i]) {
  await page.getByRole("button", { name: t }).first().click({ timeout: 2500 }).catch(() => {});
}

// 1) New post (TR: "Yeni gönderi", EN: "New post"). Click the icon's clickable
// ancestor (clicking the bare <svg> often no-ops).
const NEWPOST = 'svg[aria-label="New post"], svg[aria-label="Yeni gönderi"], svg[aria-label="New post / Reel"]';
const createIcon = page.locator(NEWPOST).first();
await createIcon.waitFor({ state: "visible", timeout: 20_000 });
await createIcon.locator('xpath=ancestor::*[self::a or @role="button" or @role="link"][1]').first()
  .click({ timeout: 8000 })
  .catch(() => createIcon.click({ force: true }).catch(() => console.log("[ig] new-post missed")));
await page.waitForTimeout(1500);
await shot(page, "ig-1-create.png");
// The Create button opens a dropdown — click the "Post" item (TR: "Gönderi").
// It's a menu item, not a link, so try text/menuitem/button in turn.
const postItem = page.getByText(/^Post$|^Gönderi$/).first();
await postItem.click({ timeout: 8000 }).catch(async () => {
  await page.getByRole("menuitem", { name: /^Post$|^Gönderi$/ }).first().click({ timeout: 4000 }).catch(async () => {
    await page.getByRole("button", { name: /^Post$|^Gönderi$/ }).first().click({ timeout: 4000 }).catch(() => console.log("[ig] post-item missed"));
  });
});
await page.waitForTimeout(2000);
await shot(page, "ig-1b-modal.png");

// 2) Select file — WAIT for the create modal, then use ITS file input (not a
// stray hidden one on the feed).
const dialog = page.locator('div[role="dialog"]').last();
const fileInput = dialog.locator('input[type="file"]').first();
await fileInput.waitFor({ state: "attached", timeout: 25_000 }).catch(async () => {
  // fall back to any file input if the dialog scoping fails
  await page.locator('input[type="file"]').first().waitFor({ state: "attached", timeout: 10_000 });
});
const fi = (await fileInput.count()) ? fileInput : page.locator('input[type="file"]').first();
await fi.setInputFiles(VIDEO);
console.log("[ig] file set");
await page.waitForTimeout(4000);
// Video → IG may pop an "OK"/"Tamam" dialog about reels.
await page.getByRole("button", { name: /^OK$|^Tamam$/ }).first().click({ timeout: 4000 }).catch(() => {});
await shot(page, "ig-2-loaded.png");

// 3) Next (crop) → Next (edit). TR: "İleri", EN: "Next".
for (let i = 0; i < 2; i++) {
  const next = page.getByRole("button", { name: /^Next$|^İleri$/ }).first();
  await next.waitFor({ state: "visible", timeout: 30_000 }).catch(() => {});
  await next.click({ timeout: 10_000 }).catch(async () => {
    await page.getByText(/^Next$|^İleri$/).first().click({ timeout: 5000 }).catch(() => console.log(`[ig] next ${i + 1} missed`));
  });
  await page.waitForTimeout(2500);
}
await shot(page, "ig-3-caption.png");

// 4) Caption (TR: "Bir açıklama yaz...", EN: "Write a caption...").
const cap = page.locator('div[aria-label="Write a caption..."], textarea[aria-label="Write a caption..."], div[aria-label="Bir açıklama yaz..."], textarea[aria-label="Bir açıklama yaz..."], div[contenteditable="true"][role="textbox"]').first();
await cap.click({ timeout: 15_000 }).catch(() => {});
await page.keyboard.type(CAPTION, { delay: 4 }).catch(() => {});
await page.waitForTimeout(1000);
await shot(page, "ig-4-captioned.png");

// 5) Share (TR: "Paylaş", EN: "Share").
const share = page.getByRole("button", { name: /^Share$|^Paylaş$/ }).first();
await share.click({ timeout: 15_000 }).catch(async () => {
  await page.getByText(/^Share$|^Paylaş$/).first().click({ timeout: 5000 }).catch(() => console.log("[ig] share missed"));
});

// Wait for the shared confirmation (TR + EN).
const ok = await page.getByText(/reel has been shared|post has been shared|your reel|shared|paylaşıldı|paylaşıldı/i)
  .first().waitFor({ state: "visible", timeout: 120_000 }).then(() => true).catch(() => false);
await page.waitForTimeout(2000);
await shot(page, "ig-5-result.png");
fs.writeFileSync(path.resolve(OUT, "ig-result.txt"), `${ok ? "SHARED" : "UNCONFIRMED"}\n`);
console.log(ok ? "[ig] ✅ SHARED" : "[ig] ⚠️ could not confirm — see ig-5-result.png");

await page.waitForTimeout(3000);
await context.close();
process.exit(0);
