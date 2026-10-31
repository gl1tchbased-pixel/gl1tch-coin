import type { Bot } from "grammy";
import { OFFICIAL } from "../content.js";
import { sentinelStore, type SentinelGemAlert } from "./store.js";

interface RadarToken {
  chain: string;
  mint: string;
  name: string;
  symbol: string;
  verdict: string;
  score: number;
  reason?: string;
  flagged?: boolean;
  meta?: {
    lpLockedPct?: number;
    mintAuthorityRevoked?: boolean;
    freezeAuthorityRevoked?: boolean;
  };
}

interface RadarResponse {
  tokens?: RadarToken[];
}

export function startSentinelEngine(bot: Bot): void {
  const channelId = process.env.SENTINEL_CHANNEL_ID;
  const intervalMinutes = Math.max(5, Number(process.env.SENTINEL_POLL_MINUTES) || 10);

  const sweep = async () => {
    try {
      const res = await fetch(`${OFFICIAL.SITE}/api/radar`, { signal: AbortSignal.timeout(10000) });
      if (!res.ok) return;
      const data = (await res.json()) as RadarResponse;
      const tokens = Array.isArray(data.tokens) ? data.tokens : [];

      for (const t of tokens) {
        if (t.chain !== "solana" || t.score < 90 || t.flagged) continue;
        if (t.verdict !== "CLEAN" && t.verdict !== "LOW RISK") continue;

        // Never fill in a lock we didn't read (e.g. during a RugCheck outage).
        const lpLockedPct = t.meta?.lpLockedPct;
        if (lpLockedPct == null) continue;

        const alert: SentinelGemAlert = {
          mint: t.mint,
          symbol: t.symbol || "TOKEN",
          name: t.name || "Unnamed token",
          score: t.score,
          verdict: t.verdict,
          lpLockedPct,
          alertedAt: Date.now(),
        };

        const added = sentinelStore.recordAlert(alert);
        if (added && channelId) {
          const text =
            `🔍 <b>GL1TCH CLEAN SCAN: $${alert.symbol}</b>\n\n` +
            `• <b>Safety Score:</b> <b>${alert.score}/100 (${alert.verdict})</b>\n` +
            `• <b>LP Lock:</b> <b>${alert.lpLockedPct}%</b>\n` +
            `• <b>Contract:</b> <code>${alert.mint}</code>\n\n` +
            `<i>Not a recommendation. A clean scan cannot rule out losses.</i>\n\n` +
            `🔬 <a href="${OFFICIAL.SITE}/scan/solana-${alert.mint}">Full Scan Report →</a>`;

          await bot.api
            .sendMessage(channelId, text, {
              parse_mode: "HTML",
              link_preview_options: { is_disabled: true },
            })
            .catch(() => {});
        }
      }
    } catch {
      /* network or site transient */
    }
  };

  // Run on start and schedule recurring sweeps
  setTimeout(sweep, 5000).unref?.();
  setInterval(sweep, intervalMinutes * 60 * 1000).unref?.();
  console.log(`[sentinel] Clean-scan sentinel armed (every ${intervalMinutes}m)`);
}

