import type { YieldOpportunity, YieldSnapshot } from "./types.js";
import { yieldWatchStore, type YieldBaseline, type YieldWatchStore } from "./watch-store.js";
import { cardUrl, chainLabel, pctText, usdText } from "./labels.js";

/**
 * Yield alerts, run right after each hourly collection. The baseline keeps the high-water mark of APY and
 * deposits, so a slow slide still triggers; after an alert it resets to the current reading (one ping per change).
 */

const HTML = { parse_mode: "HTML" as const, link_preview_options: { is_disabled: true } };
const MIN_APY_FOR_HALVING = 0.005;
const TVL_DROP = 0.3;
const IDLE_FLOOR = 0.02;

export function baselineOf(o: YieldOpportunity): YieldBaseline {
  return { apy: o.apy, tvlUsd: o.tvlUsd, idleShare: o.idleShare };
}

/** What got worse since the baseline. Nothing while the yield is still measuring or the row is stale. */
export function yieldAlertChanges(b: YieldBaseline, o: YieldOpportunity): string[] {
  if (o.apy == null || o.stale) return [];
  const out: string[] = [];
  if (b.apy != null && b.apy >= MIN_APY_FOR_HALVING && o.apy <= b.apy / 2 && o.apy >= 0) {
    out.push(`APY fell from ${pctText(b.apy)} to ${pctText(o.apy)}`);
  }
  if (o.apy < 0 && (b.apy == null || b.apy >= 0)) out.push(`Value went down over the measured window (${pctText(o.apy)})`);
  if (b.tvlUsd != null && o.tvlUsd != null && b.tvlUsd > 0 && o.tvlUsd <= b.tvlUsd * (1 - TVL_DROP)) {
    out.push(`Deposits fell ${Math.round((1 - o.tvlUsd / b.tvlUsd) * 100)}%: ${usdText(b.tvlUsd)} → ${usdText(o.tvlUsd)}`);
  }
  if (o.kind === "lending" && b.idleShare != null && b.idleShare >= IDLE_FLOOR && o.idleShare != null && o.idleShare < IDLE_FLOOR) {
    out.push(`Only ${pctText(o.idleShare, 1)} of deposits can be withdrawn right now`);
  }
  return out;
}

/** The baseline after a check: reset after an alert, otherwise keep the highs (and track withdrawable share). */
export function nextBaseline(b: YieldBaseline, o: YieldOpportunity, alerted: boolean): YieldBaseline {
  if (o.apy == null || o.stale) return b;
  if (alerted || b.apy == null) return baselineOf(o);
  return {
    apy: Math.max(b.apy, o.apy),
    tvlUsd: b.tvlUsd == null || o.tvlUsd == null ? o.tvlUsd ?? b.tvlUsd : Math.max(b.tvlUsd, o.tvlUsd),
    idleShare: o.idleShare,
  };
}

export function alertMessage(o: YieldOpportunity, changes: string[]): string {
  return (
    `📉 <b>YIELD ALERT</b> · ${o.symbol} (${o.protocol}) on ${chainLabel(o.chain)}\n\n` +
    `• ${changes.join("\n• ")}\n\n` +
    `<a href="${cardUrl(o.id)}">Open the X-Ray card →</a>\n` +
    `<i>GL1TCH read the chain. Not financial advice.</i>\n` +
    `Stop: <code>/yieldunwatch ${o.id}</code>`
  );
}

type Sender = { api: { sendMessage: (chatId: number, text: string, other?: Record<string, unknown>) => Promise<unknown> } };

/** Check every watch against the new snapshot. Returns the number of alerts sent. */
export async function sendYieldAlerts(bot: Sender, snap: YieldSnapshot, store: YieldWatchStore = yieldWatchStore): Promise<number> {
  const byId = new Map(snap.opportunities.map((o) => [o.id, o]));
  let sent = 0;
  for (const w of store.all()) {
    const o = byId.get(w.id);
    if (!o) continue;
    const changes = yieldAlertChanges(w.baseline, o);
    if (changes.length) {
      try {
        await bot.api.sendMessage(w.chatId, alertMessage(o, changes), HTML);
        sent++;
      } catch (e) {
        console.error("[yield-watch] alert send failed:", (e as Error).message);
      }
    }
    store.setBaseline(w.userId, w.id, nextBaseline(w.baseline, o, changes.length > 0));
  }
  return sent;
}
