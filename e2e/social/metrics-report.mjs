// GL1TCH growth monitor — fetches live engine metrics, diffs against the last snapshot, and
// DMs the founder a plain-language growth report on Telegram. Once/day (gated). Standalone or
// wired into x-scheduler. DRY=1 to preview without sending. FORCE=1 to ignore the daily gate.
//   NODE_OPTIONS=--use-system-ca node e2e/social/metrics-report.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(DIR, "..", "..");
const BOT = (process.env.SCAN_STATS_URL || "https://gl1tch-bot-production-3f2c.up.railway.app").replace(/\/$/, "");
const SNAP = path.resolve(DIR, "out", "metrics-snapshot.json");
const SCHED_LOG = path.resolve(DIR, "out", "scheduler.log");

function env(k) {
  try {
    const e = fs.readFileSync(path.resolve(REPO, "bot", ".env"), "utf8");
    return (e.match(new RegExp(`^\\s*${k}\\s*=(.*)$`, "m"))?.[1] ?? "").trim().replace(/^["']|["']$/g, "");
  } catch { return ""; }
}
const readJson = (p, d) => { try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return d; } };
const today = new Date().toISOString().slice(0, 10);

const prev = readJson(SNAP, null);
if (prev?.date === today && process.env.FORCE !== "1") { console.log(`[metrics] already reported today (${today}) — skip`); process.exit(0); }

// --- fetch live metrics ---
let m;
try {
  m = await (await fetch(`${BOT}/signal/metrics`, { signal: AbortSignal.timeout(9000) })).json();
} catch (e) { console.error("[metrics] fetch failed:", e.message); process.exit(1); }
if (!m?.ok) { console.error("[metrics] bad metrics response"); process.exit(1); }

// --- fetch the coin's own market/trading state (the bottom line: is anyone buying?) ---
const SITE = "https://coin-three-mu.vercel.app";
const CA = "3HQJwwHvzy8pGkPqGQcb4thZCH88MUCHVVSNtHn6pump";
let mkt = null;
try {
  const s = await (await fetch(`${SITE}/api/scan?mint=${CA}&chain=solana`, { signal: AbortSignal.timeout(20000) })).json();
  if (s?.meta) mkt = { price: s.meta.priceUsd, mcap: s.meta.marketCap, liq: s.meta.liquidityUsd, vol24: s.meta.volume24h, holders: s.meta.holderCount };
} catch { /* market optional */ }

// --- today's X activity from the scheduler log ---
function xActivityToday() {
  try {
    const log = fs.readFileSync(SCHED_LOG, "utf8");
    const lines = log.split(/\r?\n/);
    let posts = 0, replies = 0, quotes = 0, proofs = 0;
    for (const l of lines) {
      if (/x-daily.*posted|\[x-daily\] .*posted/i.test(l)) posts++;
      const rm = l.match(/\[x-reply\] done — (\d+) repl/i); if (rm) replies += Number(rm[1]);
      const qm = l.match(/\[x-newsjack\] done — (\d+) quote/i); if (qm) quotes += Number(qm[1]);
      const pm = l.match(/\[x-proof\] done — (\d+) proof/i); if (pm) proofs += Number(pm[1]);
    }
    return { replies, quotes, proofs };
  } catch { return null; }
}
const x = xActivityToday();

// --- deltas ---
const d = (cur, was) => { const n = cur - (was ?? cur); return n > 0 ? `(+${n})` : n < 0 ? `(${n})` : ""; };
const pm = prev?.m;
const usd = (v) => (typeof v === "number" ? `$${v >= 1000 ? Math.round(v).toLocaleString("en-US") : v.toFixed(v < 1 ? 6 : 2)}` : "—");
const lines = [
  `<b>📊 GL1TCH growth — ${today}</b>`,
];
// The bottom line first: is anyone buying/selling?
if (mkt) {
  const pmk = prev?.mkt;
  const holderD = pmk ? d(mkt.holders ?? 0, pmk.holders ?? 0) : "";
  const trading = (mkt.vol24 ?? 0) > 0 ? `✅ ${usd(mkt.vol24)}` : `⚪ $0 (no trades in 24h)`;
  lines.push(
    ``,
    `<b>💰 Market — is anyone trading?</b>`,
    `• 24h volume: <b>${trading}</b>`,
    `• Holders: <b>${mkt.holders ?? "?"}</b> ${holderD} · MCap: ${usd(mkt.mcap)} · Liq: ${usd(mkt.liq)}`,
  );
}
lines.push(
  ``,
  `<b>Scanner</b>`,
  `• Scans: <b>${m.scans.total}</b> ${d(m.scans.total, pm?.scans?.total)} · rugs caught: ${m.scans.flagged} ${d(m.scans.flagged, pm?.scans?.flagged)}`,
  ``,
  `<b>Signal Graph (the moat)</b>`,
  `• Deployers tracked: <b>${m.signalGraph.deployers}</b> ${d(m.signalGraph.deployers, pm?.signalGraph?.deployers)}`,
  `• Flagged actors: ${m.signalGraph.flaggedActors} ${d(m.signalGraph.flaggedActors, pm?.signalGraph?.flaggedActors)} · serial ruggers: ${m.signalGraph.serialDeployers} ${d(m.signalGraph.serialDeployers, pm?.signalGraph?.serialDeployers)}`,
  ``,
  `<b>Agent Trust Layer</b>`,
  `• Agents registered: ${m.agents.registered} ${d(m.agents.registered, pm?.agents?.registered)} · reputations: ${m.reputations} ${d(m.reputations, pm?.reputations)}`,
);
if (x) {
  const px = prev?.x;
  const since = px ? { replies: x.replies - px.replies, quotes: x.quotes - px.quotes, proofs: x.proofs - px.proofs } : null;
  const val = since
    ? `+${Math.max(0, since.replies)} replies · +${Math.max(0, since.quotes)} quote-tweets · +${Math.max(0, since.proofs)} proof-shares`
    : `${x.replies} replies · ${x.quotes} quote-tweets · ${x.proofs} proof-shares (to date)`;
  lines.push(``, `<b>X engine (since last report)</b>`, `• ${val}`);
}
if (m.signalGraph.serialDeployers > (pm?.signalGraph?.serialDeployers ?? 0)) {
  lines.push(``, `🚨 <b>New serial rugger caught</b> — the auto proof-share should fire on X.`);
}
lines.push(``, `<i>Analytics (traffic/referrers): Vercel dashboard → coin → Analytics.</i>`);
const report = lines.join("\n");

console.log(report.replace(/<\/?b>|<\/?i>/g, ""));

if (process.env.DRY === "1") { console.log("\n[metrics] DRY — not sending"); process.exit(0); }

// --- send to founder DM(s) ---
const TOKEN = env("BOT_TOKEN");
const admins = env("ADMIN_IDS").split(/[,\s]+/).filter(Boolean);
let sent = 0;
for (const id of admins) {
  try {
    const r = await (await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: id, text: report, parse_mode: "HTML", link_preview_options: { is_disabled: true } }),
    })).json();
    if (r.ok) { sent++; console.log(`[metrics] sent to admin ${id}`); }
    else console.log(`[metrics] admin ${id} DM failed: ${r.description} (they must have /start'd the bot)`);
  } catch (e) { console.log(`[metrics] send error for ${id}: ${e.message}`); }
}

// persist snapshot regardless (so deltas are day-over-day)
fs.mkdirSync(path.dirname(SNAP), { recursive: true });
fs.writeFileSync(SNAP, JSON.stringify({ date: today, m, x, mkt, at: Date.now() }));
console.log(`[metrics] snapshot saved · delivered to ${sent}/${admins.length} admin(s)`);
