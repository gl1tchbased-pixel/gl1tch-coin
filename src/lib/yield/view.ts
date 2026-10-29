import { CHAIN_LABEL, KIND_LABEL, PROTOCOLS, VAULT_NAMES } from "./copy";
import { riskOf, type RiskLevel } from "./risk";
import { pct } from "./format";
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

/** Chains the GL1TCH scanner can read (Tron addresses aren't supported there yet). */
const SCANNABLE = new Set<YieldOpportunity["chain"]>(["ethereum", "base", "arbitrum", "bsc", "robinhood", "solana"]);

/** `/scan` permalinks for every token involved (the chain's own coin has nothing to scan). */
export function scanLinks(o: YieldOpportunity): { label: string; href: string }[] {
  if (!SCANNABLE.has(o.chain)) return [];
  return (o.tokens ?? [])
    .filter((t) => t.address !== "native")
    .map((t) => ({ label: `Scan ${t.symbol === "aToken" ? "the aToken" : t.symbol}`, href: `/scan?t=${o.chain}:${t.address}` }));
}

export const SITE = "https://gl1tchbased.xyz";
export const TELEGRAM_BOT = "https://t.me/gl1tch_infected_bot";

/** "Watch on Telegram": opens the bot and subscribes this yield in one tap. */
export const telegramLink = (id: string) => `${TELEGRAM_BOT}?start=yield_${id}`;
export const cardUrl = (id: string) => `${SITE}/yield/${id}`;

export function shareText(o: YieldOpportunity): string {
  const apy = o.apy == null ? "still being measured" : `${pct(o.apy)}${o.kind === "dex-lp" ? " fee APR" : " APY"}`;
  return `${displayName(o)} on ${CHAIN_LABEL[o.chain] ?? o.chain}: ${apy}. Who pays it, how you get out and the on-chain proof, via GL1TCH Yield X-Ray:`;
}
