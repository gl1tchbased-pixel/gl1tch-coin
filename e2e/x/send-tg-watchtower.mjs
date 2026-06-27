// Announce the Watchtower to the GL1TCH group: explainer video + caption, then pin.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(DIR, "..", "..");
const env = fs.readFileSync(path.resolve(REPO, "bot", ".env"), "utf8");
const BOT = (env.match(/^BOT_TOKEN=(.*)$/m) || [])[1]?.trim().replace(/^["']|["']$/g, "");
if (!BOT) throw new Error("BOT_TOKEN not found");
const CHAT = "-1003955980388";
const VID = path.resolve(REPO, "pump-pack", "videos", "branded", "gl1tch-watchtower2.mp4");

const caption = `👁 <b>Your bag was fine at midnight. By 3am it was a rug.</b>

You were asleep. GL1TCH wasn't.

The <b>Watchtower</b> never stops watching. <b>/watch</b> any token and the AI keeps re-scanning it — the second its safety drops (LP unlocked, an authority comes back, verdict falls) <b>it pings you right here. Before the chart even moves.</b>

Try it now:
<code>/watch bonk</code>  ·  <code>/watching</code>  ·  <code>/unwatch</code>

Free · non-custodial · any chain. This is what an AI in your corner actually looks like.`;

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
fd.set("caption", caption);
fd.set("supports_streaming", "true");
fd.set("video", new Blob([fs.readFileSync(VID)], { type: "video/mp4" }), "gl1tch-watchtower.mp4");
const msg = await tg("sendVideo", fd, false);
console.log("[tg] sent video", msg.message_id);
await tg("pinChatMessage", { chat_id: CHAT, message_id: msg.message_id, disable_notification: false }, true);
console.log("[tg] pinned");
process.exit(0);
