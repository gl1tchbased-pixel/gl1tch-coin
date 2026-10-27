/**
 * Revenue ledger client for the paid agent API (x402). Each settled payment is reported to the
 * bot's /revenue/record (token-guarded); /revenue/record and GET /revenue live next to the scan
 * counter in the bot's data directory. Reports run after the response so they never delay it.
 */

import { after } from "next/server";
import { routeIdFromUrl, type PaidRouteId } from "@/lib/x402/config";

const BASE = (process.env.SCAN_STATS_URL || "https://bot.gl1tchbased.xyz").replace(/\/$/, "");
const TOKEN = process.env.STATS_TOKEN || "";

/** Same shape as bot/src/revenue.ts (site and bot don't share code). Amounts in micro-USDC. */
export interface RevenueEntry {
  tx: string;
  network: string;
  route: PaidRouteId;
  amountMicro: number;
  payer?: string;
  self: boolean;
  at: number;
}

export interface Tally { count: number; usdMicro: number }

export interface RevenueSummary {
  ok: true;
  since: number | null;
  paid: Tally;
  self: Tally;
  byRoute: Record<string, Tally>;
  byNetwork: Record<string, Tally>;
  daily: Record<string, Tally>;
  recent: RevenueEntry[];
}

/** The fields we read from an x402 settlement response. */
export interface SettleLike {
  success: boolean;
  transaction?: string;
  network?: string;
  amount?: string;
  payer?: string;
}

/** A settled payment → ledger entry. Null unless it succeeded, names its tx and network, belongs
 *  to a paid route and carries a positive integer amount. Our own test wallets come back `self`. */
export function revenueEntryFromSettle(
  input: { result: SettleLike; requirementsAmount?: string; resourceUrl?: string },
  selfPayers: Set<string>,
  now = Date.now()
): RevenueEntry | null {
  const { result } = input;
  if (!result.success || !result.transaction || !result.network) return null;
  const route = input.resourceUrl ? routeIdFromUrl(input.resourceUrl) : null;
  if (!route) return null;
  const raw = result.amount ?? input.requirementsAmount ?? "";
  if (!/^\d+$/.test(raw)) return null;
  const amountMicro = Number(raw);
  if (!Number.isSafeInteger(amountMicro) || amountMicro < 1) return null;
  const entry: RevenueEntry = {
    tx: result.transaction,
    network: result.network,
    route,
    amountMicro,
    self: !!result.payer && selfPayers.has(result.payer),
    at: now,
  };
  if (result.payer) entry.payer = result.payer;
  return entry;
}

/** Non-blocking report to the bot ledger. Runs via after() when inside a request. */
export function recordRevenue(entry: RevenueEntry): void {
  if (!TOKEN) return;
  const send = () =>
    fetch(`${BASE}/revenue/record`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-stats-token": TOKEN },
      body: JSON.stringify(entry),
      signal: AbortSignal.timeout(4000),
    }).then(
      () => {},
      () => {}
    );
  try {
    after(send);
  } catch {
    void send(); // outside a request scope (after() throws there)
  }
}

export async function getRevenue(): Promise<RevenueSummary | null> {
  try {
    const r = await fetch(`${BASE}/revenue`, { signal: AbortSignal.timeout(6000), next: { revalidate: 30 } });
    if (!r.ok) return null;
    const d = (await r.json()) as RevenueSummary;
    return d && d.ok === true && d.paid ? d : null;
  } catch {
    return null;
  }
}
