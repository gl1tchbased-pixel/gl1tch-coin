// Announce the Scanner v2 to the GL1TCH Telegram group: photo + caption, then pin.
// Reads BOT_TOKEN from bot/.env. Read-only social post; no wallet interaction.
//   NODE_OPTIONS=--use-system-ca node e2e/x/send-tg-scan.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(DIR, "..", "..");
const env = fs.readFileSync(path.resolve(REPO, "bot", ".env"), "utf8");
const BOT = (env.match(/^BOT_TOKEN=(.*)$/m) || [])[1]?.trim().replace(/^["']|["']$/g, "");
if (!BOT) throw new Error("BOT_TOKEN not found");
const CHAT = "-1003955980388";
const IMG = path.resolve(REPO, "pump-pack", "images", "scan-proof-pepe.png");

const caption = `🔍 <b>The GL1TCH Scanner just leveled up.</b>

Every other bot wants to trade for you — and hold your keys. Ours doesn't. It only <i>reads</i> the chain.

Paste any token by <b>name or contract</b> — Solana, Ethereum, Base, BNB &amp; more — and it tells you straight:

✅ Honeypot / can you actually sell
✅ LP locked or burned
✅ Mint &amp; freeze authority
✅ Buy/sell + adjustable tax
✅ Ownership renounced?
✅ Holder concentration

Every flag comes with a plain-English <i>why</i> — you keep the judgment.

Don't trust us? <b>Scan us.</b> Then scan your next ape before you buy it.

👉 coin-three-mu.vercel.app/scan
Or right here: <code>/scan bonk</code>

Non-custodial · Read-only · Free · Not financial advice.`;

async function tg(method, body) {
  const res = await fetch(`https://api.telegram.org/bot${BOT}/${method}`, body);
  const j = await res.json();
  if (!j.ok) throw new Error(`${method}: ${j.description}`);
  return j.result;
}

// sendPhoto (multipart)
const fd = new FormData();
fd.set("chat_id", CHAT);
fd.set("parse_mode", "HTML");
fd.set("caption", caption);
const bytes = fs.readFileSync(IMG);
fd.set("photo", new Blob([bytes], { type: "image/png" }), "scan-proof.png");
const msg = await tg("sendPhoto", { method: "POST", body: fd });
console.log("[tg] sent message_id", msg.message_id);

// pin it
await tg("pinChatMessage", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ chat_id: CHAT, message_id: msg.message_id, disable_notification: false }),
});
console.log("[tg] pinned");
process.exit(0);
