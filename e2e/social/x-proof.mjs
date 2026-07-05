// Serial-deployer proof auto-share — the strongest social proof: the product catching real
// repeat ruggers. Polls the bot's Signal Graph for deployers with >=3 flagged tokens (so it's
// undeniable) and posts a verifiable proof tweet. Fires ONLY on real catches — never fabricates.
//   NODE_OPTIONS=--use-system-ca LAUNCH_CHROMIUM=1 node e2e/social/x-proof.mjs
// Env: MIN (flagged tokens required, default 3) · DRY=1 (preview) · MAX (posts/run, default 1).
import { openX, postThread, store } from "./x-lib.mjs";

const BOT = (process.env.SCAN_STATS_URL || "https://gl1tch-bot-production-3f2c.up.railway.app").replace(/\/$/, "");
const SITE = "coin-three-mu.vercel.app";
const MIN = Number(process.env.MIN || 3);
const MAX = Number(process.env.MAX || 1);

const short = (a) => `${a.slice(0, 4)}…${a.slice(-4)}`;

async function serialDeployers() {
  try {
    const r = await fetch(`${BOT}/signal/serial?min=${MIN}`, { signal: AbortSignal.timeout(8000) });
    if (!r.ok) return [];
    const d = await r.json();
    return Array.isArray(d.serial) ? d.serial : [];
  } catch { return []; }
}

function proofPost(rep) {
  const tok = (rep.recent || []).find((t) => /HIGH RISK|RUG-SHAPED/i.test(t.verdict)) || rep.recent?.[0];
  const scanLink = tok ? `${SITE}/scan/${rep.chain}-${tok.mint}` : `${SITE}/scan`;
  return `🚨 The Signal Graph just caught a serial deployer.

Wallet ${short(rep.deployer)} has launched ${rep.tokensSeen} tokens we've scanned — ${rep.flaggedCount} scored rug-shaped / high-risk.

Now every fresh token from it auto-flags ⚠ before anyone buys. Don't trust me — verify:
${scanLink}`;
}

const st = store("x-proof-state.json");
const state = st.read();
state.shared = state.shared || {}; // deployerKey -> ts

const serials = await serialDeployers();
const fresh = serials.filter((r) => !state.shared[`${r.chain}:${r.deployer}`]);
console.log(`[x-proof] ${serials.length} serial deployers (>=${MIN} flagged) · ${fresh.length} not yet shared`);

if (!fresh.length) { console.log("[x-proof] nothing new to share (this is normal until the graph catches a real repeat rugger)"); process.exit(0); }

if (process.env.DRY === "1") {
  for (const r of fresh.slice(0, MAX)) console.log("\n[DRY] would post:\n" + proofPost(r));
  process.exit(0);
}

const { context, page } = await openX();
let posted = 0;
try {
  for (const r of fresh) {
    if (posted >= MAX) break;
    const text = proofPost(r);
    console.log("\n→ posting proof for " + short(r.deployer));
    const ok = await postThread(page, text).catch(() => false);
    if (ok) { state.shared[`${r.chain}:${r.deployer}`] = Date.now(); st.write(state); posted++; console.log("  ✅ shared"); }
    else console.log("  ⚠️ post failed");
    await page.waitForTimeout(5000);
  }
} finally {
  console.log(`[x-proof] done — ${posted} proof post(s)`);
  await page.waitForTimeout(1500);
  await context.close();
}
