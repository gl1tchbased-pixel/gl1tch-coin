// Generic Telegram video poster for GL1TCH content. Pick a preset via POST env,
// optionally pin with PIN=1. Reusable for every new original video.
//   POST=anatomy PIN=1 node e2e/x/send-tg-video.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(DIR, "..", "..");
const env = fs.readFileSync(path.resolve(REPO, "bot", ".env"), "utf8");
const BOT = (env.match(/^BOT_TOKEN=(.*)$/m) || [])[1]?.trim().replace(/^["']|["']$/g, "");
if (!BOT) throw new Error("BOT_TOKEN not found");
const CHAT = "-1003955980388";

const PRESETS = {
  v3: {
    video: "gl1tch-scanner-upgraded.mp4",
    caption: `🤖 <b>The GL1TCH Scanner just leveled up.</b>

Others run checks. GL1TCH <i>investigates</i>:

🤖 <b>AI verdict</b> — reads the chain, tells you straight in its own words
🐋 <b>Degen intel</b> — insiders, bundled wallets &amp; fake liquidity exposed
🛡 <b>Verified</b> — real blue-chips flagged, clones caught, correct price any chain
📡 <b>Shareable</b> — every scan gets a card + an embeddable badge

Free · non-custodial · any chain.
🔍 coin-three-mu.vercel.app/scan · <code>/scan &lt;token&gt;</code>`,
  },
  wtguide: {
    video: "gl1tch-watchtower-howto.mp4",
    caption: `👁 <b>How the Watchtower works</b> — in 4 steps:

1️⃣ <code>/watch</code> a token → it locks today's scan as a baseline
2️⃣ re-scans every 3 hours, automatically
3️⃣ catches any drop — LP unlocked, an authority returns, verdict falls
4️⃣ pings you right here — <b>before the chart even moves</b>

Try it now: <code>/watch bonk</code> · full scanner coin-three-mu.vercel.app/scan`,
  },
  multichain: {
    video: "gl1tch-multichain.mp4",
    caption: `🔗 <b>6 chains. 1 scanner.</b>

Most rug-checkers only work on one chain. GL1TCH reads them all — Solana, Ethereum, Base, BNB, Arbitrum, Polygon, Optimism, Avalanche &amp; more.

Same plain-English verdict everywhere: honeypot, LP lock, mint/freeze, tax, holders.

Your chain is covered → <code>/scan &lt;token&gt;</code> or coin-three-mu.vercel.app/scan`,
  },
  anatomy: {
    video: "gl1tch-anatomy.mp4",
    caption: `📉 <b>Anatomy of a rug.</b>

It 100x'd in a day. Then it went to zero.

The traps were there the whole time — 🔓 unlocked liquidity, 🪙 a live mint authority, 🐋 a 61% whale. GL1TCH reads all of it in <b>5 seconds</b>, before you ape.

Scan anything → <code>/scan &lt;token&gt;</code> or coin-three-mu.vercel.app/scan

<i>Don't trust. Verify.</i>`,
  },
};

const P = PRESETS[process.env.POST || "anatomy"];
if (!P) throw new Error("unknown POST preset: " + process.env.POST);
const VID = path.resolve(REPO, "pump-pack", "videos", "branded", P.video);

async function tg(method, body, json) {
  const res = await fetch(`https://api.telegram.org/bot${BOT}/${method}`, json
    ? { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }
    : { method: "POST", body });
  const j = await res.json();
  if (!j.ok) throw new Error(`${method}: ${j.description}`);
  return j.result;
}

const fd = new FormData();
fd.set("chat_id", CHAT);
fd.set("parse_mode", "HTML");
fd.set("caption", P.caption);
fd.set("supports_streaming", "true");
fd.set("video", new Blob([fs.readFileSync(VID)], { type: "video/mp4" }), P.video);
const msg = await tg("sendVideo", fd, false);
console.log("[tg] sent video", msg.message_id);
if (process.env.PIN === "1") {
  await tg("pinChatMessage", { chat_id: CHAT, message_id: msg.message_id, disable_notification: false }, true);
  console.log("[tg] pinned");
}
process.exit(0);
