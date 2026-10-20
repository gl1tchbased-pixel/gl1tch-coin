/**
 * Holder concentration without counting the liquidity pool. On a Pump.fun / AMM token the largest
 * account is usually the pool's vault, which holds tokens waiting to be bought, not a whale who can
 * dump. Counting it made every such token (including $GL1TCH) fail "Top holder" at ~97%.
 */

export interface Holder { owner: string | null; pct: number }

interface KnownAccount { type?: string }
interface MarketLike {
  pubkey?: string;
  liquidityAAccount?: { owner?: string } | null;
  liquidityBAccount?: { owner?: string } | null;
}

/** Pool owners: RugCheck's AMM-labelled known accounts, every market's pool address and the owners of its vaults. */
export function poolOwnersFrom(known: Record<string, KnownAccount> | null | undefined, markets: MarketLike[] | null | undefined): Set<string> {
  const out = new Set<string>();
  for (const [address, k] of Object.entries(known ?? {})) if (String(k?.type ?? "").toUpperCase() === "AMM") out.add(address);
  for (const m of markets ?? []) {
    if (m?.pubkey) out.add(m.pubkey);
    if (m?.liquidityAAccount?.owner) out.add(m.liquidityAAccount.owner);
    if (m?.liquidityBAccount?.owner) out.add(m.liquidityBAccount.owner);
  }
  return out;
}

export interface RealHolders {
  /** Largest holder that isn't a pool (0 when every listed holder is a pool). Null with no holder data. */
  topPct: number | null;
  /** Top 10 holders that aren't pools, combined. */
  top10Pct: number | null;
  /** Share of supply sitting in pool accounts. */
  poolPct: number;
}

export function realHolders(holders: Holder[], pools: Set<string>): RealHolders {
  if (!holders.length) return { topPct: null, top10Pct: null, poolPct: 0 };
  const isPool = (h: Holder) => !!h.owner && pools.has(h.owner);
  const real = holders.filter((h) => !isPool(h)).sort((a, b) => b.pct - a.pct);
  const poolPct = holders.filter(isPool).reduce((s, h) => s + h.pct, 0);
  return {
    topPct: real.length ? real[0].pct : 0,
    top10Pct: Math.min(100, real.slice(0, 10).reduce((s, h) => s + h.pct, 0)),
    poolPct: Math.min(100, poolPct),
  };
}
