#!/usr/bin/env node
/**
 * One-off Telegram post — Glitchy mascot reveal.
 *
 * Uses bot/.env BOT_TOKEN + AGENT_CHANNEL_ID. Sends the landscape MP4 hosted
 * on the live Vercel site as a video with caption. No bot redeploy needed.
 *
 * Run:
 *   $env:NODE_OPTIONS="--use-system-ca"; node scripts/tg-glitchy-reveal.mjs
 */

import fs from "node:fs";

// ---- env loader -----------------------------------------------------------
for (const file of ["bot/.env", ".env.local"]) {
  if (!fs.existsSync(file)) continue;
  for (const raw of fs.readFileSync(file, "utf8").split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const k = line.slice(0, eq).trim();
    const v = line.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!(k in process.env)) process.env[k] = v;
  }
}

const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.AGENT_CHANNEL_ID || process.env.GROUP_ID;
if (!BOT_TOKEN || !CHAT_ID) {
  console.error("Missing BOT_TOKEN or AGENT_CHANNEL_ID/GROUP_ID in bot/.env");
  process.exit(1);
}

const VIDEO_URL = "https://coin-three-mu.vercel.app/brand/glitchy-share-landscape.mp4";

const CAPTION = `👻 <b>GLITCHY IS HERE.</b>

your mascot. your carrier. your face on the timeline.

he was rendered inside a corrupted node.
now he lives in every wallet that holds $GL1TCH.

🟢 $GL1TCH · Solana
🟢 0% Tax · Renounced · LP burned
🟢 CA: <code>3HQJwwHvzy8pGkPqGQcb4thZCH88MUCHVVSNtHn6pump</code>

→ site: https://coin-three-mu.vercel.app
→ chart: https://dexscreener.com/solana/9fi2sFnnySPhNwJZPzZwxZT3xQnjPa9dh3EQbVNCstRW

drop him in your PFP.
let him spread.`;

const api = `https://api.telegram.org/bot${BOT_TOKEN}`;

async function call(method, body) {
  const res = await fetch(`${api}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(`${method} failed: ${JSON.stringify(json)}`);
  return json.result;
}

async function main() {
  console.log(`→ Target chat: ${CHAT_ID}`);
  console.log(`→ Video URL: ${VIDEO_URL}`);

  const msg = await call("sendVideo", {
    chat_id: CHAT_ID,
    video: VIDEO_URL,
    caption: CAPTION,
    parse_mode: "HTML",
    supports_streaming: true,
    width: 1200,
    height: 630,
    duration: 6,
  });
  console.log(`✓ Sent. message_id=${msg.message_id}`);

  try {
    await call("pinChatMessage", {
      chat_id: CHAT_ID,
      message_id: msg.message_id,
      disable_notification: false,
    });
    console.log(`✓ Pinned.`);
  } catch (e) {
    console.log(`! Could not pin (need admin rights): ${e.message}`);
  }
}

main().catch((e) => { console.error("✗", e.message); process.exit(1); });
