import type { ChainReality, RealityChain, RealityView } from "./types";

/** Pure helpers for the New Token Reality page, its JSON API, the MCP tool and the scan-result line. */

export const REALITY_CHAINS: RealityChain[] = ["solana", "ethereum", "base", "bsc", "arbitrum", "polygon"];
export const CHAIN_LABEL: Record<RealityChain, string> = { solana: "Solana", ethereum: "Ethereum", base: "Base", bsc: "BNB Chain", arbitrum: "Arbitrum", polygon: "Polygon" };

export const isRealityChain = (x: unknown): x is RealityChain => typeof x === "string" && (REALITY_CHAINS as string[]).includes(x);

/** Scanner chain ids → ours ("eth" never appears in the scanner, but be lenient). */
export function realityChainOf(scanChain: string | null | undefined): RealityChain | null {
  const c = (scanChain ?? "").toLowerCase();
  if (c === "eth") return "ethereum";
  if (c === "polygon_pos") return "polygon";
  return isRealityChain(c) ? c : null;
}

export const pct = (x: number | null | undefined, digits = 0) => (x == null || !Number.isFinite(x) ? "—" : `${(x * 100).toFixed(digits)}%`);
export const signedPct = (x: number | null | undefined) => (x == null || !Number.isFinite(x) ? "—" : `${x >= 0 ? "+" : "−"}${Math.abs(x * 100).toFixed(0)}%`);

export type Window = "week" | "all";

/** Which numbers can be published for a chain: last 7 days if big enough, else all kept data if big enough, else none. */
export function publishable(c: ChainReality, minSample: number): { window: Window; rates: ChainReality["week"] | ChainReality["all"] } | null {
  if (c.week.n >= minSample) return { window: "week", rates: c.week };
  if (c.all.n >= minSample) return { window: "all", rates: c.all };
  return null;
}

/** One honest sentence, or null when the sample is too small. */
export function headline(c: ChainReality, minSample: number): string | null {
  const p = publishable(c, minSample);
  if (!p) return null;
  const when = p.window === "week" ? "launched in the last week we can fully measure" : "launched in the period we have measured";
  return `${pct(p.rates.lostHalfOrMoreShare)} of new ${CHAIN_LABEL[c.chain]} tokens ${when} either stopped trading within an hour or lost at least half their value within three days (sample of ${p.rates.n}).`;
}

export function dexLabel(id: string): string {
  return id
    .replace(/[-_](ethereum|base|bsc|arbitrum|polygon|solana)$/i, "")
    .replace(/[-_]/g, " ")
    .replace(/\b(v\d)\b/gi, (m) => m.toUpperCase())
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

export function collectingNote(c: ChainReality, minSample: number, now = Date.now()): string {
  const n = Math.max(c.week.n, c.all.n);
  if (!c.sampled) return "Sampling has not found a brand-new token here yet.";
  if (c.firstResultAt && c.firstResultAt > now) return `${c.sampled} tokens sampled; the first 3-day results are due ${new Date(c.firstResultAt).toUTCString().slice(5, 22)} UTC.`;
  return `${n} of ${minSample} measured launches needed before a number is published (${c.awaiting} more waiting for their 3 days).`;
}

export function realityApiResponse(view: RealityView | null, q: URLSearchParams): { status: number; body: Record<string, unknown> } {
  const chain = q.get("chain")?.trim().toLowerCase() ?? null;
  if (chain !== null && !isRealityChain(chain)) return { status: 400, body: { error: `Unknown chain. Use one of: ${REALITY_CHAINS.join(", ")}.` } };
  if (!view) return { status: 503, body: { error: "Data not available right now; try again shortly.", page: "https://gl1tchbased.xyz/new-token-reality" } };
  const meta = { updatedAt: new Date(view.updatedAt).toISOString(), samplingSince: view.startedAt ? new Date(view.startedAt).toISOString() : null, minSample: view.minSample, page: "https://gl1tchbased.xyz/new-token-reality", priceData: "GeckoTerminal" };
  const shape = (c: ChainReality) => {
    const p = publishable(c, view.minSample);
    return { chain: c.chain, published: p ? { window: p.window, ...p.rates } : null, headline: headline(c, view.minSample), sampled: c.sampled, awaiting: c.awaiting, firstResultAt: c.firstResultAt ? new Date(c.firstResultAt).toISOString() : null, byDex: c.byDex, weekly: c.weekly };
  };
  if (chain) {
    const c = view.chains.find((x) => x.chain === chain);
    return c ? { status: 200, body: { ...meta, ...shape(c) } } : { status: 404, body: { error: "Chain not measured." } };
  }
  return { status: 200, body: { ...meta, chains: view.chains.map(shape) } };
}

export function realityText(view: RealityView | null, chain: RealityChain): string {
  if (!view) return "New Token Reality data is not available right now. Try again shortly.";
  const c = view.chains.find((x) => x.chain === chain);
  if (!c) return `${CHAIN_LABEL[chain]} is not measured.`;
  const h = headline(c, view.minSample);
  if (!h) return `${CHAIN_LABEL[chain]}: not enough measured launches yet. ${collectingNote(c, view.minSample)} https://gl1tchbased.xyz/new-token-reality`;
  const p = publishable(c, view.minSample)!.rates;
  return [
    h,
    `Stopped trading within the first hour: ${pct(p.stoppedShare)}. Of those still trading, ${pct(p.halvedShare)} were down ≥50% three days later (${pct(p.wipedShare)} down ≥90%); median change ${signedPct(p.medianChange72)}.`,
    "Base rates from tokens sampled at birth, not a prediction for any single token and not financial advice.",
    "Details: https://gl1tchbased.xyz/new-token-reality",
  ].join("\n");
}
