/**
 * The token verdict card (paid /api/x402/verdict): a full scan condensed to what an agent posts to a
 * chat or feed. One summary line, the grade and score, the top three reasons, and links to the
 * shareable scan page and its card image. The rogue-AI narrative is left out on purpose: catalogs
 * screen metadata for text that reads as instructions, and a verdict card should only describe.
 * The `quip` is one light line in Glitchy's voice for social posts. It only restates the grade and the
 * top reason: no advice, no prediction, and nothing anyone can pay to change.
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
  quip: string;
  disclaimer: string;
}

export const VERDICT_DISCLAIMER = "Automated risk read, not financial advice.";

const QUIPS: Record<string, string[]> = {
  CLEAN: ["No traps found. Glitchy almost got bored.", "Glitchy poked every wire and nothing sparked.", "Clean read. Boring, in the best way."],
  "LOW RISK": ["Mostly tidy. Glitchy found a loose wire or two, nothing on fire.", "Low risk on this read. Glitchy still kept one eye open."],
  CAUTION: ["Mixed signals. Glitchy squinted at this one: {reason}.", "Glitchy's antenna twitched: {reason}."],
  "HIGH RISK": ["Glitchy's alarms are ringing: {reason}.", "Red lights on the board: {reason}."],
  "RUG-SHAPED": ["This one is shaped like a rug. Glitchy saw: {reason}.", "Rug-shaped read. The loudest signal: {reason}."],
  UNKNOWN: ["Glitchy couldn't read enough of this token to judge it."],
};

/** One line in Glitchy's voice, picked by the mint so the same token always gets the same line. */
export function verdictQuip(verdict: string, mint: string, topReason?: { label: string; value: string }): string {
  const lines = QUIPS[verdict] ?? QUIPS.UNKNOWN;
  let h = 0;
  for (const ch of mint) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const line = lines[h % lines.length];
  if (!line.includes("{reason}")) return line;
  return topReason ? line.replace("{reason}", `${topReason.label.toLowerCase()} ${topReason.value}`) : QUIPS.UNKNOWN[0];
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
  const verdict = str(body.verdict) ?? "UNKNOWN";
  const page = `${site.replace(/\/$/, "")}/scan/${chain}-${mint}`;
  return {
    mint,
    chain,
    name: str(body.name),
    symbol: str(body.symbol),
    verdict,
    score: num(body.score) ?? 0,
    confidence: num(body.confidence),
    verified: body.verified === true,
    summary: str(body.bottomLine) ?? "",
    reasons,
    card: { page, image: `${page}/opengraph-image` },
    scannedAt: num(body.scannedAt),
    quip: verdictQuip(verdict, mint, reasons[0]),
    disclaimer: VERDICT_DISCLAIMER,
  };
}
