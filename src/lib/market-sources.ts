/**
 * Generic, multi-chain token market resolver for the SCANNER.
 *
 * Primary:  DexScreener  /latest/dex/tokens/{address}   (all chains, gives chainId)
 * Fallback: GeckoTerminal /networks/{net}/tokens/{address}
 *
 * DexScreener silently drops low-volume pairs (it returns 0 pairs for $GL1TCH),
 * which blanked price/mcap/liquidity in scan results. GeckoTerminal still tracks
 * those pools, so we fall back to it per-chain. Both are key-less; this runs
 * server-side (the /api/scan route) so the browser never hits a CORS wall.
 */

export interface TokenMarket {
  chain: string | null;
  name: string | null;
  symbol: string | null;
  priceUsd: number | null;
  marketCap: number | null;
  liquidityUsd: number | null;
  volume24h: number | null;
  ageDays: number | null;
  priceChange24h: number | null;
  source: "dexscreener" | "geckoterminal" | null;
}

const EMPTY: TokenMarket = {
  chain: null, name: null, symbol: null, priceUsd: null, marketCap: null,
  liquidityUsd: null, volume24h: null, ageDays: null, priceChange24h: null, source: null,
};

const num = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v
    : typeof v === "string" && v !== "" && Number.isFinite(Number(v)) ? Number(v) : null;

// DexScreener chainId → GeckoTerminal network slug (they differ).
const GT_NETWORK: Record<string, string> = {
  solana: "solana", ethereum: "eth", bsc: "bsc", base: "base", polygon: "polygon_pos",
  arbitrum: "arbitrum", optimism: "optimism", avalanche: "avax", fantom: "ftm",
  cronos: "cro", zksync: "zksync", linea: "linea", scroll: "scroll", mantle: "mantle",
  blast: "blast", opbnb: "opbnb",
};

interface DexPair {
  chainId?: string;
  pairCreatedAt?: number;
  priceUsd?: string;
  marketCap?: number;
  fdv?: number;
  liquidity?: { usd?: number };
  volume?: { h24?: number };
  priceChange?: { h24?: number };
  baseToken?: { name?: string; symbol?: string };
}

/** DexScreener — deepest-liquidity pair across all chains. */
async function fromDexScreener(address: string, signal?: AbortSignal): Promise<TokenMarket | null> {
  try {
    const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${address}`, { signal, headers: { accept: "application/json" } });
    if (!res.ok) return null;
    const data: { pairs?: (DexPair & { baseToken?: { address?: string } })[] } = await res.json();
    const all = data.pairs ?? [];
    if (!all.length) return null;
    // Only pairs where OUR token is the base — otherwise priceUsd/marketCap describe
    // the OTHER token in the pair (e.g. our token quoted against WETH).
    const want = address.toLowerCase();
    let pairs = all.filter((x) => (x.baseToken?.address ?? "").toLowerCase() === want);
    if (!pairs.length) return null;
    // 1) Same-address tokens exist on OTHER chains (e.g. 0xC02aa… is WETH on ETH but a
    //    shitcoin elsewhere). Restrict to the chain of the deepest pair.
    const deepestChain = pairs.reduce((b, x) => ((x.liquidity?.usd ?? 0) > (b.liquidity?.usd ?? 0) ? x : b)).chainId;
    pairs = pairs.filter((x) => x.chainId === deepestChain);
    // 2) Reject price-corrupted pools (bad decimals report e.g. BONK at 1000× its real
    //    price — and that inflates the pool's USD liquidity too, so liquidity can't be
    //    trusted). The real price is the one shared by the MOST pools; a corrupted pool
    //    is a lone outlier. Pick the price magnitude with the most pools (tiebreak: liq).
    const mag = (pr: number) => Math.round(Math.log10(pr));
    const cnt = new Map<number, number>(), liqByMag = new Map<number, number>();
    for (const x of pairs) {
      const pr = num(x.priceUsd); if (pr == null || pr <= 0) continue;
      const m = mag(pr);
      cnt.set(m, (cnt.get(m) ?? 0) + 1);
      liqByMag.set(m, (liqByMag.get(m) ?? 0) + (x.liquidity?.usd ?? 0));
    }
    if (cnt.size > 1) {
      let bestMag: number | null = null, bestCnt = -1, bestLiq = -1;
      for (const [m, c] of cnt) {
        const liq = liqByMag.get(m) ?? 0;
        if (c > bestCnt || (c === bestCnt && liq > bestLiq)) { bestCnt = c; bestLiq = liq; bestMag = m; }
      }
      const sane = pairs.filter((x) => { const pr = num(x.priceUsd); return pr != null && pr > 0 && mag(pr) === bestMag; });
      if (sane.length) pairs = sane;
    }
    // Representative pool = the MOST-TRADED one, not the deepest. Bridged/vault tokens
    // (e.g. wrapped BTC) park billions in a pool with ~no trading — that's custody, not
    // tradeable liquidity. The highest-volume pool reflects the real, usable market.
    const anyVol = pairs.some((x) => (x.volume?.h24 ?? 0) > 0);
    const p = pairs.reduce((best, x) =>
      anyVol
        ? ((x.volume?.h24 ?? 0) > (best.volume?.h24 ?? 0) ? x : best)
        : ((x.liquidity?.usd ?? 0) > (best.liquidity?.usd ?? 0) ? x : best));
    const created = p.pairCreatedAt ? Number(p.pairCreatedAt) : null;
    return {
      chain: p.chainId ?? null,
      name: p.baseToken?.name ?? null,
      symbol: p.baseToken?.symbol ?? null,
      priceUsd: num(p.priceUsd),
      marketCap: num(p.marketCap) ?? num(p.fdv),
      liquidityUsd: num(p.liquidity?.usd),
      volume24h: num(p.volume?.h24),
      ageDays: created ? Math.max(0, Math.floor((Date.now() - created) / 86_400_000)) : null,
      priceChange24h: num(p.priceChange?.h24),
      source: "dexscreener",
    };
  } catch {
    return null;
  }
}

interface GtPoolAttrs {
  base_token_price_usd?: string | null;
  quote_token_price_usd?: string | null;
  market_cap_usd?: string | null;
  fdv_usd?: string | null;
  reserve_in_usd?: string | null;
  volume_usd?: { h24?: string };
  price_change_percentage?: { h24?: string };
  name?: string; // e.g. "GL1TCH / SOL"
  pool_created_at?: string | null;
}
interface GtPool {
  attributes?: GtPoolAttrs;
  relationships?: {
    base_token?: { data?: { id?: string } };
    quote_token?: { data?: { id?: string } };
  };
}

/**
 * GeckoTerminal — per-chain POOLS endpoint (deepest-reserve pool). The token
 * endpoint often omits price_usd for thin tokens; the pools endpoint carries
 * base_token_price_usd, market cap, reserve and 24h change reliably.
 * Resolves whether our token is the base or quote side so the price is correct.
 */
async function fromGecko(chain: string, address: string, signal?: AbortSignal): Promise<TokenMarket | null> {
  const net = GT_NETWORK[chain];
  if (!net) return null;
  try {
    const res = await fetch(`https://api.geckoterminal.com/api/v2/networks/${net}/tokens/${address}/pools`, { signal, headers: { accept: "application/json" } });
    if (!res.ok) return null;
    const data: { data?: GtPool[] } = await res.json();
    const pools = data.data ?? [];
    if (!pools.length) return null;
    const want = `${address.toLowerCase()}`;
    const isBase = (p: GtPool) => (p.relationships?.base_token?.data?.id ?? "").toLowerCase().endsWith(want);
    // Prefer pools where our token is the base side; else fall back to any pool
    // and read the quote-side price so we never report the wrong token's value.
    const basePools = pools.filter(isBase);
    const usable = basePools.length ? basePools : pools;
    const p = usable.reduce((best, x) => (Number(x.attributes?.reserve_in_usd ?? 0) > Number(best.attributes?.reserve_in_usd ?? 0) ? x : best));
    const a = p.attributes ?? {};
    const tokenIsBase = isBase(p);
    const price = num(tokenIsBase ? a.base_token_price_usd : a.quote_token_price_usd);
    const created = a.pool_created_at ? Date.parse(a.pool_created_at) : NaN;
    const ageDays = Number.isFinite(created) ? Math.max(0, Math.floor((Date.now() - created) / 86_400_000)) : null;
    // The token's symbol is whichever side it is in "BASE / QUOTE".
    const parts = a.name?.split("/").map((s) => s.trim()) ?? [];
    const sym = (tokenIsBase ? parts[0] : parts[1]) || null;
    // market_cap_usd / fdv_usd describe the BASE token — only trust them when our
    // token IS the base. Otherwise leave mcap to the price×supply fallback upstream.
    const marketCap = tokenIsBase ? (num(a.market_cap_usd) ?? num(a.fdv_usd)) : null;
    return {
      chain,
      name: sym,
      symbol: sym,
      priceUsd: price,
      marketCap,
      liquidityUsd: num(a.reserve_in_usd),
      volume24h: num(a.volume_usd?.h24),
      ageDays,
      priceChange24h: tokenIsBase ? num(a.price_change_percentage?.h24) : null,
      source: "geckoterminal",
    };
  } catch {
    return null;
  }
}

/**
 * Resolve current market data for any token, merging both sources so there are no
 * gaps: DexScreener leads (richer: age, 24h change); GeckoTerminal fills whatever
 * DexScreener is missing (or carries the whole thing when DexScreener has no pair).
 * @param knownChain pass when caller already knows the chain (e.g. Solana scan path).
 */
export async function fetchTokenMarket(address: string, knownChain?: string, signal?: AbortSignal): Promise<TokenMarket> {
  const dex = await fromDexScreener(address, signal);

  // Coherent-snapshot rule: use ONE source as the price/mcap/liquidity row so the
  // numbers are internally consistent. DexScreener leads when it has a price; only
  // if it doesn't (thin/de-indexed pair) do we fall to GeckoTerminal wholesale.
  let primary: TokenMarket | null = dex && dex.priceUsd != null ? dex : null;
  if (!primary) {
    const chain = dex?.chain ?? knownChain ?? null;
    const gt = chain ? await fromGecko(chain, address, signal) : null;
    primary = gt && gt.priceUsd != null ? gt : (dex ?? gt);
  }
  if (!primary) return { ...EMPTY, chain: knownChain ?? null };

  // Backfill ONLY independent context fields (age, 24h change) when missing — never
  // mix a market cap from a different source than the price.
  if ((primary.ageDays == null || primary.priceChange24h == null) && primary.source === "geckoterminal" && dex) {
    if (primary.ageDays == null) primary.ageDays = dex.ageDays;
    if (primary.priceChange24h == null) primary.priceChange24h = dex.priceChange24h;
  }
  if (!primary.chain) primary.chain = dex?.chain ?? knownChain ?? null;
  // Some listings prefix the ticker with "$" — strip it so the UI doesn't render "$$WIF".
  if (primary.symbol) primary.symbol = primary.symbol.replace(/^\$+/, "");
  return primary;
}
