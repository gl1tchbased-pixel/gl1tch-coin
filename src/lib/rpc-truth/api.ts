import type { TruthChain, TruthView } from "./types";
import { GRADE_META, findings, isDepth, recommend, summarize } from "./view";

/** Shapes the free /api/rpc-truth answer (and the MCP tool's text). Pure: tested without a server. */

export const TRUTH_CHAINS: TruthChain[] = ["solana", "ethereum", "base", "bsc", "arbitrum", "polygon"];
const isChain = (x: string | null): x is TruthChain => !!x && (TRUTH_CHAINS as string[]).includes(x);
const PAGE = "https://gl1tchbased.xyz/rpc-truth";

export function truthApiResponse(view: TruthView | null, q: URLSearchParams): { status: number; body: Record<string, unknown> } {
  const chain = q.get("chain")?.trim().toLowerCase() ?? null;
  const depth = q.get("depth")?.trim() ?? null;
  const minSpanRaw = q.get("minSpan");
  if (chain !== null && !isChain(chain)) return { status: 400, body: { error: `Unknown chain. Use one of: ${TRUTH_CHAINS.join(", ")}.` } };
  if (depth !== null && !isDepth(depth)) return { status: 400, body: { error: "depth must be one of: 1h, 1d, 7d, 30d." } };
  const minSpan = minSpanRaw === null ? undefined : Number(minSpanRaw);
  if (minSpan !== undefined && (!Number.isInteger(minSpan) || minSpan < 1 || minSpan > 10_000_000)) return { status: 400, body: { error: "minSpan must be a whole number of blocks." } };
  if (!view) return { status: 503, body: { error: "Measurement not available yet; try again in a few minutes.", page: PAGE } };

  const meta = { measuredAt: new Date(view.finishedAt).toISOString(), nextRunAt: new Date(view.nextRunAt).toISOString(), page: PAGE, method: `${PAGE}#how` };
  if (!chain) return { status: 200, body: { ...meta, summary: summarize(view), silentFailures: findings(view), chains: view.chains, records: view.records } };

  const recs = recommend(view, chain, { depth: depth ?? undefined, minSpan });
  const avoid = view.chains
    .find((c) => c.chain === chain)
    ?.endpoints.filter((e) => e.grade === "silent_failure" || (view.records[e.id]?.silentRuns7d ?? 0) > 0)
    .map((e) => ({ url: e.url, provider: e.provider, why: e.grade === "silent_failure" ? GRADE_META.silent_failure.meaning : "Had a silent failure in the last 7 days." }));
  return {
    status: 200,
    body: {
      ...meta,
      chain,
      filters: { depth: depth ?? null, minSpan: minSpan ?? null },
      recommended: recs,
      avoid: avoid ?? [],
      ...(recs.length ? {} : { note: "No free endpoint met every filter on the latest pass. Relax depth/minSpan or use a keyed/paid endpoint." }),
    },
  };
}

/** Plain-text answer for the MCP tool. */
export function truthText(view: TruthView | null, chain: TruthChain, depth?: string): string {
  if (!view) return "RPC Truth measurement not available right now. Try again in a few minutes.";
  const d = depth && isDepth(depth) ? depth : undefined;
  const recs = recommend(view, chain, { depth: d });
  const silent = findings(view).filter((f) => f.chain === chain);
  const lines = [
    `RPC Truth (${chain}, measured ${new Date(view.finishedAt).toISOString()}${d ? `, needs ${d} of history` : ""}):`,
    ...(recs.length
      ? recs.slice(0, 5).map((r) => `• ${r.url} — ${GRADE_META[r.grade].label}, history ${r.reach ?? "none"}${r.maxLogSpan ? `, getLogs ≤${r.maxLogSpan.toLocaleString("en-US")} blocks` : ""}${r.latencyMs ? `, ${r.latencyMs} ms` : ""}`)
      : ["• No free endpoint met the filter on the latest pass."]),
    ...(silent.length ? [`Avoid (silent empty answers right now): ${[...new Set(silent.map((s) => s.url))].join(", ")}`] : []),
    `Details: ${PAGE}#${chain}`,
  ];
  return lines.join("\n");
}
