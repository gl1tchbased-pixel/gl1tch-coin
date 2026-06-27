// Announce the new in-chat auto-scan feature to the GL1TCH group, then pin it.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(DIR, "..", "..");
const env = fs.readFileSync(path.resolve(REPO, "bot", ".env"), "utf8");
const BOT = (env.match(/^BOT_TOKEN=(.*)$/m) || [])[1]?.trim().replace(/^["']|["']$/g, "");
if (!BOT) throw new Error("BOT_TOKEN not found");
const CHAT = "-1003955980388";

const text = `🛰 <b>New: paste any contract — I scan it instantly.</b>

You don't even need /scan anymore. Drop any token's contract address in this chat — Solana, ETH, Base, BNB &amp; more — and I'll auto-read the chain and reply with the full safety verdict:

✅ Honeypot / can you actually sell
✅ LP locked or burned
✅ Mint &amp; freeze authority
✅ Tax &amp; ownership
✅ Holder concentration

👇 <b>Try it right now — paste a contract address.</b>

This is what GL1TCH is: an AI that actually protects holders. Free · Non-custodial · Read-only.`;

async function tg(method, payload) {
  const res = await fetch(`https://api.telegram.org/bot${BOT}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const j = await res.json();
  if (!j.ok) throw new Error(`${method}: ${j.description}`);
  return j.result;
}

const msg = await tg("sendMessage", {
  chat_id: CHAT, text, parse_mode: "HTML",
  link_preview_options: { is_disabled: true },
});
console.log("[tg] sent", msg.message_id);
await tg("pinChatMessage", { chat_id: CHAT, message_id: msg.message_id, disable_notification: false });
console.log("[tg] pinned");
process.exit(0);
