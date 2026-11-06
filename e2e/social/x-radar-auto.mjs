/**
 * Autonomous GL1TCH Rug Radar Alert & Discloser
 * Continuously monitors fresh Solana launches and automatically exposes rugs, honeypots,
 * and wash-trading traps on X (@gl1tchbased).
 *
 * Usage:
 *   node e2e/social/x-radar-auto.mjs          # Run 1 cycle (ideal for scheduler)
 *   node e2e/social/x-radar-auto.mjs --watch  # Run continuous loop every 20 mins
 */

import path from "node:path";
import fs from "node:fs";
import { openX, postThread, store, shot } from "./x-lib.mjs";

const RADAR_URL = process.env.RADAR_URL || "https://gl1tchbased.xyz/api/radar";
const SCAN_URL = process.env.SCAN_URL || "https://gl1tchbased.xyz/api/scan";
const SITE = "https://gl1tchbased.xyz";
const MAX_PER_RUN = Number(process.env.MAX_PER_RUN || 1);
const DRY = process.env.DRY === "1";
const INTERVAL_MINS = Number(process.env.RADAR_INTERVAL_MINS || 20);

const st = store("x-radar-posted.json");

function loadState() {
  const data = st.read();
  if (!data.postedMints) data.postedMints = {};
  return data;
}

function savePosted(mint, symbol, reason) {
  const data = loadState();
  data.postedMints[mint] = {
    symbol,
    reason,
    at: Date.now(),
  };
  st.write(data);
}

async function fetchRadarTokens() {
  try {
    const res = await fetch(RADAR_URL, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return [];
    const json = await res.json();
    return Array.isArray(json.caught) ? json.caught : [];
  } catch (err) {
    console.error("[x-radar-auto] Failed to fetch radar tokens:", err.message);
    return [];
  }
}

async function fetchDeepScan(mint) {
  try {
    const url = `${SCAN_URL}?mint=${encodeURIComponent(mint)}&chain=solana`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function buildAlertTweet(token, scan) {
  const symbol = (token.symbol || scan?.symbol || "TOKEN").replace(/^\$/, "").toUpperCase();
  const rawName = token.name || scan?.name || symbol;
  const name = rawName.length > 14 ? rawName.slice(0, 14) + "…" : rawName;
  const mint = token.mint;
  const shortMint = `${mint.slice(0, 6)}...${mint.slice(-4)}`;

  const flags = [];

  // Check 1: LP Lock
  const lp = scan?.meta?.lpLockedPct ?? (token.reason?.includes("LP") ? 0 : null);
  if (lp !== null && lp < 50) {
    flags.push(`• LP Locked: ${lp}% (Drain risk)`);
  }

  // Check 2: Fake/wash trading
  const tradeCheck = (scan?.checks || []).find((c) => c.key === "trade_quality");
  if (tradeCheck && tradeCheck.status === "fail") {
    flags.push(`• Wash-trading bot volume`);
  } else if (scan?.meta?.fromPeakPct && scan.meta.fromPeakPct > 80) {
    flags.push(`• Dumped ${Math.round(scan.meta.fromPeakPct)}% from peak`);
  }

  // Check 3: Top holder or metadata
  if (scan?.meta?.top10Pct && scan.meta.top10Pct > 70 && lp !== 100) {
    flags.push(`• Top 10 hold ${Math.round(scan.meta.top10Pct)}% supply`);
  } else if (scan?.meta?.mutableMetadata) {
    flags.push(`• Mutable metadata enabled`);
  }

  // Fallback to radar reason if needed
  if (flags.length === 0 && token.reason) {
    const cleanReason = token.reason.replace(/https?:\/\/\S+/g, "").slice(0, 40);
    flags.push(`• ${cleanReason}`);
  }

  const flagsText = flags.slice(0, 3).join("\n");
  const scanLink = `${SITE}/scan/solana-${mint}`;

  const tweet = `🚨 GL1TCH RUG RADAR ALERT 🚨

$${symbol} (${name}) on Solana
Mint: ${shortMint}

⚠️ RED FLAGS:
${flagsText}

Scan free before you ape:
${scanLink}

$GL1TCH #Solana`;

  // Validate Twitter character limit (URL = 23 chars)
  const norm = tweet.replace(/https?:\/\/\S+/g, "x".repeat(23));
  if (norm.length > 280) {
    // Shorter fallback
    return `🚨 GL1TCH RUG RADAR ALERT

$${symbol} on Solana (${shortMint})
⚠️ Red Flags:
${flags.slice(0, 2).join("\n")}

Scan free before aping:
${scanLink}
$GL1TCH #Solana`;
  }

  return tweet;
}

export async function runRadarAutoCycle() {
  console.log(`\n[x-radar-auto] Checking Rug Radar at ${new Date().toISOString()}...`);
  const state = loadState();
  const tokens = await fetchRadarTokens();

  if (!tokens.length) {
    console.log("[x-radar-auto] No caught tokens currently in radar.");
    return 0;
  }

  // Find tokens with red flags that haven't been posted yet
  const candidates = [];
  for (const t of tokens) {
    if (state.postedMints[t.mint]) continue;
    // We target tokens with caution/risk scores or low LP lock / high concentration
    candidates.push(t);
  }

  console.log(`[x-radar-auto] Found ${tokens.length} radar tokens, ${candidates.length} fresh unposted.`);
  if (!candidates.length) {
    console.log("[x-radar-auto] All current radar tokens have already been disclosed.");
    return 0;
  }

  let postedCount = 0;
  let browserContext = null;
  let browserPage = null;

  for (const token of candidates) {
    if (postedCount >= MAX_PER_RUN) break;

    console.log(`[x-radar-auto] Deep scanning ${token.symbol || "token"} (${token.mint})...`);
    const scan = await fetchDeepScan(token.mint);
    const tweetText = buildAlertTweet(token, scan);

    console.log("\n[x-radar-auto] Composed Alert Tweet:\n" + tweetText);

    if (DRY) {
      console.log("[DRY RUN] Would post alert above to @gl1tchbased.");
      savePosted(token.mint, token.symbol || "UNKNOWN", "dry_run");
      postedCount++;
      continue;
    }

    if (!browserPage) {
      const { context, page } = await openX();
      browserContext = context;
      browserPage = page;
    }

    try {
      console.log(`[x-radar-auto] Posting alert for $${token.symbol} to @gl1tchbased...`);
      const ok = await postThread(browserPage, tweetText).catch((e) => {
        console.error("[x-radar-auto] Post error:", e.message);
        return false;
      });

      if (ok) {
        savePosted(token.mint, token.symbol || "TOKEN", token.reason || "radar_alert");
        postedCount++;
        console.log(`[x-radar-auto] ✅ Successfully posted alert for ${token.symbol} (${token.mint})!`);
      } else {
        console.warn(`[x-radar-auto] ⚠️ Post failed or unconfirmed for ${token.mint}`);
      }
    } catch (err) {
      console.error("[x-radar-auto] Error during posting:", err.message);
    }

    await new Promise((r) => setTimeout(r, 4000));
  }

  if (browserContext) {
    await browserContext.close().catch(() => {});
  }

  return postedCount;
}

// CLI entry point
const isWatch = process.argv.includes("--watch") || process.argv.includes("-w");

if (isWatch) {
  console.log(`[x-radar-auto] Starting autonomous daemon (every ${INTERVAL_MINS}m)...`);
  await runRadarAutoCycle().catch((e) => console.error("[x-radar-auto] Cycle error:", e.message));
  setInterval(async () => {
    await runRadarAutoCycle().catch((e) => console.error("[x-radar-auto] Cycle error:", e.message));
  }, INTERVAL_MINS * 60_000);
} else {
  runRadarAutoCycle()
    .then((count) => {
      console.log(`[x-radar-auto] Completed run. Posted: ${count}`);
      process.exit(0);
    })
    .catch((err) => {
      console.error("[x-radar-auto] Fatal:", err);
      process.exit(1);
    });
}
