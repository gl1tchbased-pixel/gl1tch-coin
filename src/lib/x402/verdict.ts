/**
 * The token verdict card (paid /api/x402/verdict): a full scan condensed to what an agent posts to a
 * chat or feed. One summary line, the grade and score, the top three reasons, and links to the
 * shareable scan page and its card image. The rogue-AI narrative is left out on purpose: catalogs
 * screen metadata for text that reads as instructions, and a verdict card should only describe.
 */

import type { ScanCheck } from "@/lib/scan";

export interface VerdictCard {
  mint: string;
  chain: string;
  name: string | null;
  symbol: string | null;
  verdict: string;
  score: number;
  confidence: number | null;
  verified: boolean;
  summary: string;
  reasons: { label: string; value: string; status: "fail" | "warn" }[];
  card: { page: string; image: string };
  scannedAt: number | null;
}

/** Build the card from a successful scan report body. */
export function verdictCard(body: Record<string, unknown>, site: string): VerdictCard {
  const str = (v: unknown) => (typeof v === "string" ? v : null);
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
  const checks = (Array.isArray(body.checks) ? body.checks : []) as ScanCheck[];
  const reasons = [...checks.filter((c) => c.status === "fail"), ...checks.filter((c) => c.status === "warn")]
    .slice(0, 3)
    .map((c) => ({ label: c.label, value: c.value, status: c.status as "fail" | "warn" }));
  const mint = str(body.mint) ?? "";
  const chain = str(body.chain) ?? "solana";
  const page = `${site.replace(/\/$/, "")}/scan/${chain}-${mint}`;
  return {
    mint,
    chain,
    name: str(body.name),
    symbol: str(body.symbol),
    verdict: str(body.verdict) ?? "UNKNOWN",
    score: num(body.score) ?? 0,
    confidence: num(body.confidence),
    verified: body.verified === true,
    summary: str(body.bottomLine) ?? "",
    reasons,
    card: { page, image: `${page}/opengraph-image` },
    scannedAt: num(body.scannedAt),
  };
}
