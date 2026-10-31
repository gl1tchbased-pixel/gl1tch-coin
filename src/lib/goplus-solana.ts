import type { ScanRisk } from "@/lib/scan";
import { realHolders, type Holder } from "@/lib/holders";

/**
 * GoPlus's Solana token report, the stand-in when RugCheck has no answer (its API can fail for every token at
 * once). It covers holders, metadata, burned LP and the dangerous Token-2022 powers. It has no insider, linked
 * wallet or deployer-history data: those stay unknown rather than being guessed.
 */

interface Authority { status?: string }
interface GoplusDex { id?: string; type?: string; burn_percent?: number | null }
interface GoplusHolder { account?: string; percent?: string }

export interface GoplusSolanaToken {
  metadata_mutable?: Authority;
  holder_count?: string;
  holders?: GoplusHolder[];
  dex?: GoplusDex[];
  balance_mutable_authority?: Authority;
  closable?: Authority;
  transfer_hook_upgradable?: Authority;
  transfer_fee_upgradable?: Authority;
  non_transferable?: string;
}

export interface GoplusReport {
  risks: ScanRisk[];
  lpLockedPct: number | null;
  mutable: boolean | null;
  topHolderPct: number | null;
  realTopPct: number | null;
  realTop10Pct: number | null;
  poolPct: number | null;
  top10Pct: number | null;
  holderCount: number | null;
}

const on = (a?: Authority) => a?.status === "1";

export function parseGoplusSolana(t: GoplusSolanaToken, pool: string | null): GoplusReport {
  const holders: Holder[] = (t.holders ?? [])
    .map((h) => ({ owner: h.account ?? null, pct: Number(h.percent) * 100 }))
    .filter((h) => Number.isFinite(h.pct));
  const pools = new Set([...(t.dex ?? []).map((d) => d.id ?? ""), pool ?? ""].filter(Boolean));
  const real = realHolders(holders, pools);

  // Only a standard AMM has an LP token to burn. Concentrated pools report a meaningless figure here.
  const burned = (t.dex ?? [])
    .filter((d) => d.type === "Standard" && typeof d.burn_percent === "number")
    .map((d) => d.burn_percent as number);

  const risks: ScanRisk[] = [];
  if (on(t.balance_mutable_authority)) risks.push({ name: "An authority can change token balances", level: "danger" });
  if (t.non_transferable === "1") risks.push({ name: "Token can't be transferred", level: "danger" });
  if (on(t.closable)) risks.push({ name: "An authority can close the mint", level: "warn" });
  if (on(t.transfer_hook_upgradable)) risks.push({ name: "Transfer hook can be changed", level: "warn" });
  if (on(t.transfer_fee_upgradable)) risks.push({ name: "Transfer fee can be changed", level: "warn" });

  const count = Number(t.holder_count);
  return {
    risks,
    lpLockedPct: burned.length ? Math.max(...burned) : null,
    mutable: t.metadata_mutable ? on(t.metadata_mutable) : null,
    topHolderPct: holders.length ? Math.max(...holders.map((h) => h.pct)) : null,
    realTopPct: real.topPct,
    realTop10Pct: real.top10Pct,
    poolPct: holders.length ? real.poolPct : null,
    top10Pct: holders.length ? Math.min(100, holders.slice(0, 10).reduce((s, h) => s + h.pct, 0)) : null,
    holderCount: Number.isFinite(count) && count > 0 ? count : null,
  };
}

export async function fetchGoplusSolana(mint: string, pool: string | null, signal?: AbortSignal): Promise<GoplusReport | null> {
  try {
    const res = await fetch(`https://api.gopluslabs.io/api/v1/solana/token_security?contract_addresses=${mint}`, {
      headers: { accept: "application/json" },
      signal,
    });
    if (!res.ok) return null;
    const j = (await res.json()) as { result?: Record<string, GoplusSolanaToken> };
    const token = j.result?.[mint] ?? Object.values(j.result ?? {})[0];
    return token ? parseGoplusSolana(token, pool) : null;
  } catch {
    return null;
  }
}
