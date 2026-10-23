import { after } from "next/server";
import type { VerdictRecord } from "./merkle";

const BASE = (process.env.SCAN_STATS_URL || "https://bot.gl1tchbased.xyz").replace(/\/$/, "");
const TOKEN = process.env.STATS_TOKEN || "";

/** Hands a Rug Radar sweep's verdicts to the bot, which keeps them for the attester to seal on Solana (A3).
 *  Non-blocking like the stats bump: runs after the response, and a failure only means that sweep isn't sealed. */
export function submitSweep(records: VerdictRecord[], sweepMs: number): void {
  if (!TOKEN || !records.length) return;
  after(() =>
    fetch(`${BASE}/attest/batch`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-stats-token": TOKEN },
      body: JSON.stringify({ sweepMs, records }),
      signal: AbortSignal.timeout(6000),
    }).then(
      () => {},
      () => {}
    )
  );
}
