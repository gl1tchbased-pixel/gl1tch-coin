// Talks to the public GL1TCH scan API (free, no key) and pulls a token address out of whatever was
// pasted or shared: a bare address, a Pump.fun / Solscan / DexScreener link, or a sentence with a link in it.

export const API = "https://gl1tchbased.xyz/api/scan";

export type CheckStatus = "pass" | "warn" | "fail" | "unknown";
export type Verdict = "CLEAN" | "LOW RISK" | "CAUTION" | "HIGH RISK" | "RUG-SHAPED" | "UNKNOWN";

export interface ScanCheck {
  key: string;
  label: string;
  status: CheckStatus;
  value: string;
  explain: string;
}

export interface ScanResult {
  mint: string;
  chain: string;
  name: string | null;
  symbol: string | null;
  score: number;
  confidence: number;
  verdict: Verdict;
  bottomLine: string;
  checks: ScanCheck[];
}

const SOL_RE = /[1-9A-HJ-NP-Za-km-z]{32,44}/g;
const EVM_RE = /0x[0-9a-fA-F]{40}/;

/** First token-looking address in the text. EVM first (unambiguous), then the longest base58 run. */
export function extractAddress(text: string | null | undefined): string | null {
  if (!text) return null;
  const evm = text.match(EVM_RE);
  if (evm) return evm[0];
  const sol = (text.match(SOL_RE) || []).sort((a, b) => b.length - a.length);
  return sol[0] ?? null;
}

export async function scan(address: string, signal?: AbortSignal): Promise<ScanResult> {
  const chain = address.startsWith("0x") ? "" : "&chain=solana";
  const res = await fetch(`${API}?mint=${encodeURIComponent(address)}${chain}`, { signal });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.verdict) throw new Error(body.error || `Scan failed (HTTP ${res.status})`);
  return body as ScanResult;
}

export const VERDICT_COLOR: Record<Verdict, string> = {
  CLEAN: "#7CFF6B",
  "LOW RISK": "#B6F25A",
  CAUTION: "#FFC94D",
  "HIGH RISK": "#FF7A45",
  "RUG-SHAPED": "#FF4D6D",
  UNKNOWN: "#9AA0B4",
};

export const STATUS_ICON: Record<CheckStatus, string> = { pass: "✓", warn: "!", fail: "✗", unknown: "?" };
export const STATUS_COLOR: Record<CheckStatus, string> = { pass: "#7CFF6B", warn: "#FFC94D", fail: "#FF4D6D", unknown: "#9AA0B4" };
