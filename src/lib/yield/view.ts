import { CHAIN_LABEL, KIND_LABEL, PROTOCOLS, VAULT_NAMES } from "./copy";
import { riskOf, type RiskLevel } from "./risk";
import type { YieldOpportunity } from "./types";

/** What a table row needs, computed on the server so the client bundle carries no scoring logic. */
export interface YieldRow {
  id: string;
  name: string;
  protocolName: string;
  chain: YieldOpportunity["chain"];
  chainLabel: string;
  kind: YieldOpportunity["kind"];
  kindLabel: string;
  apy: number | null;
  window: YieldOpportunity["window"];
  tvlUsd: number | null;
  riskScore: number;
  riskLevel: RiskLevel;
  stable: boolean;
  stale: boolean;
}

export const displayName = (o: Pick<YieldOpportunity, "symbol">) => VAULT_NAMES[o.symbol] ?? o.symbol;
export const protocolName = (o: Pick<YieldOpportunity, "protocol">) => PROTOCOLS[o.protocol]?.name ?? o.protocol;

export function toRow(o: YieldOpportunity): YieldRow {
  const r = riskOf(o);
  return {
    id: o.id,
    name: displayName(o),
    protocolName: protocolName(o),
    chain: o.chain,
    chainLabel: CHAIN_LABEL[o.chain] ?? o.chain,
    kind: o.kind,
    kindLabel: KIND_LABEL[o.kind] ?? o.kind,
    apy: o.apy,
    window: o.window,
    tvlUsd: o.tvlUsd,
    riskScore: r.score,
    riskLevel: r.level,
    stable: o.stable,
    stale: o.stale,
  };
}

/** `/scan` permalinks for the tokens involved (the chain's own coin has nothing to scan). */
export function scanLinks(o: YieldOpportunity): { label: string; href: string }[] {
  const out: { label: string; href: string }[] = [];
  if (o.asset.address !== "native") out.push({ label: `Scan ${o.asset.symbol}`, href: `/scan?t=${o.chain}:${o.asset.address}` });
  if (o.receipt && o.receipt.address !== o.asset.address) out.push({ label: `Scan ${o.receipt.symbol === "aToken" ? "the aToken" : o.receipt.symbol}`, href: `/scan?t=${o.chain}:${o.receipt.address}` });
  return out;
}
