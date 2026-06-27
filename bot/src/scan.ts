import { Composer, type Context } from "grammy";
import { OFFICIAL } from "./content.js";

/**
 * The GL1TCH Scanner inside Telegram. Calls the live web API (the same multi-chain
 * engine the website uses) so there's no duplicated logic. Read-only, never touches
 * anyone's wallet.
 *   /scan <token name or contract address>   — explicit command
 *   (auto)  paste a contract address in chat  — the bot scans it automatically
 */
export const scanCommands = new Composer<Context>();
export const autoScan = new Composer<Context>();

const API = `${OFFICIAL.SITE}/api/scan`;
const HTML = { parse_mode: "HTML" as const, link_preview_options: { is_disabled: true } };

const VERDICT_EMOJI: Record<string, string> = {
  CLEAN: "🟢", "LOW RISK": "🟢", CAUTION: "🟡", "HIGH RISK": "🟠", "RUG-SHAPED": "🔴", UNKNOWN: "⚪",
};
const CHECK_EMOJI: Record<string, string> = { pass: "✅", warn: "⚠️", fail: "❌", unknown: "❔" };

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const EVM_RE = /^0x[0-9a-fA-F]{40}$/;
const SOL_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const isAddr = (s: string) => EVM_RE.test(s) || SOL_RE.test(s);
const fmtUsd = (v: number | null) =>
  v == null ? "—" : v >= 1e6 ? `$${(v / 1e6).toFixed(2)}M` : v >= 1e3 ? `$${(v / 1e3).toFixed(1)}K` : `$${v.toFixed(2)}`;
// Meme-coin prices are tiny — show significant digits, not "$0.00".
const fmtPrice = (v: number | null) => {
  if (v == null) return "—";
  if (v >= 1) return `$${v.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
  if (v >= 0.0001) return `$${v.toPrecision(3).replace(/0+$/, "").replace(/\.$/, "")}`;
  const exp = Math.floor(Math.log10(v));
  const zeros = -exp - 1;
  const sig = String(Math.round(v / Math.pow(10, exp - 2))).replace(/0+$/, "") || "0";
  return `$0.0(${zeros})${sig}`;
};

export interface Check { label: string; status: string; value: string }
export interface Risk { name: string; level: string }
export interface ScanData {
  name: string | null; symbol: string | null; chain: string; verdict: string; score: number;
  confidence?: number; verified?: boolean; bottomLine?: string; aiVerdict?: string; checks: Check[]; risks?: Risk[]; mint: string;
  meta: { priceUsd: number | null; priceChange24h?: number | null; marketCap: number | null; liquidityUsd: number | null; holderCount: number | null; topHolderPct: number | null; lpLockedPct?: number | null; insiderPct?: number | null };
  error?: string;
}

function chainName(c: string) { return c.charAt(0).toUpperCase() + c.slice(1); }

function format(r: ScanData, more: number): string {
  const head = `${VERDICT_EMOJI[r.verdict] || "⚪"} <b>${esc(r.name || "Unknown")}</b>${r.symbol ? ` $${esc(r.symbol)}` : ""}${r.verified ? " ✓" : ""}  ·  <i>${esc(chainName(r.chain))}</i>`;
  const conf = r.confidence != null ? `  ·  <i>${r.confidence}% confidence</i>` : "";
  const verdict = `\n\n<b>VERDICT: ${esc(r.verdict)}</b>  —  ${r.score}/100${conf}`;
  const bottom = r.bottomLine ? `\n<i>${esc(r.bottomLine)}</i>` : "";
  const ai = r.aiVerdict ? `\n\n◉ <b>AI READ</b>\n<i>${esc(r.aiVerdict)}</i>` : "";
  const checks = "\n\n" + r.checks.map((c) => `${CHECK_EMOJI[c.status] || "❔"} ${esc(c.label)}: <b>${esc(c.value)}</b>`).join("\n");
  const risks = r.risks && r.risks.length
    ? `\n\n⚑ <b>Risks:</b> ${r.risks.slice(0, 5).map((x) => esc(x.name)).join(" · ")}`
    : "";
  const lp = r.meta.lpLockedPct != null ? `LP ${r.meta.lpLockedPct}% locked` : null;
  const holders = r.meta.topHolderPct != null ? `top holder ${r.meta.topHolderPct.toFixed(1)}%` : r.meta.holderCount != null ? `${r.meta.holderCount.toLocaleString("en-US")} holders` : null;
  const chg = r.meta.priceChange24h != null ? ` (${r.meta.priceChange24h >= 0 ? "+" : ""}${r.meta.priceChange24h.toFixed(1)}% 24h)` : "";
  const price = r.meta.priceUsd != null ? `${fmtPrice(r.meta.priceUsd)}${chg}` : null;
  const meta = `\n\n<i>${[price, `mcap ${fmtUsd(r.meta.marketCap)}`, `liq ${fmtUsd(r.meta.liquidityUsd)}`, lp, holders].filter(Boolean).join(" · ")}</i>`;
  const moreLine = more > 1 ? `\n\n<i>Scanned the top match — ${more - 1} other token(s) share that name. Scan a specific one with /scan &lt;address&gt;.</i>` : "";
  const link = `\n<a href="${OFFICIAL.SITE}/scan/${encodeURIComponent(r.chain)}-${encodeURIComponent(r.mint)}">Full report →</a>`;
  const foot = `\n\n<i>GL1TCH read the chain — it never touched your wallet. Not financial advice.</i>`;
  return head + verdict + bottom + ai + checks + risks + meta + moreLine + link + foot;
}

const getJson = async <T>(url: string): Promise<T> => (await fetch(url).then((r) => r.json())) as T;

/**
 * Fetch the raw scan result for a name or address (or null if nothing usable).
 * Shared by the /scan command, the auto-scanner and the Watchtower sweep.
 */
export async function getScanData(query: string, chain?: string): Promise<(ScanData & { candidates?: Array<{ address: string; chain: string }> }) | null> {
  const q = query.trim();
  if (!q) return null;
  let data: ScanData & { candidates?: Array<{ address: string; chain: string }> };
  if (isAddr(q)) {
    const chainQ = chain ? `&chain=${encodeURIComponent(chain)}` : "";
    data = await getJson(`${API}?mint=${encodeURIComponent(q)}${chainQ}`);
  } else {
    const s = await getJson<{ candidates?: Array<{ address: string; chain: string }> }>(`${API}?q=${encodeURIComponent(q)}`);
    const list = s.candidates || [];
    if (!list.length) return null;
    const top = list[0];
    data = await getJson(`${API}?mint=${top.address}&chain=${top.chain}`);
    data = { ...data, candidates: list };
  }
  if (!data || data.error || !data.verdict) return null;
  return data;
}

/** Run a scan and return the formatted HTML message, or null. */
export async function runScan(query: string): Promise<string | null> {
  const data = await getScanData(query);
  if (!data) return null;
  return format(data, data.candidates?.length || 1);
}

/** Compact one-line status for watchlists/alerts. */
export function shortLine(d: ScanData): string {
  const lp = d.meta.lpLockedPct != null ? ` · LP ${d.meta.lpLockedPct}%` : "";
  return `${VERDICT_EMOJI[d.verdict] || "⚪"} <b>${esc(d.symbol || d.name || "token")}</b> · ${esc(chainName(d.chain))} · <b>${esc(d.verdict)}</b> ${d.score}/100${lp}`;
}

export const scanLink = (chain: string, mint: string) =>
  `${OFFICIAL.SITE}/scan/${encodeURIComponent(chain)}-${encodeURIComponent(mint)}`;

scanCommands.command("scan", async (ctx) => {
  const q = (ctx.match || "").trim();
  if (!q) {
    await ctx.reply(
      "🔍 <b>GL1TCH SCANNER</b>\n\nPaste a token name or contract and I'll read the chain — honeypot, mint/freeze, tax, liquidity, ownership, holders. Any chain.\n\n<code>/scan bonk</code>\n<code>/scan 0x6982508145454ce325ddbe47a25d4ec3d2311933</code>\n\nFull tool: " + OFFICIAL.SITE + "/scan",
      HTML
    );
    return;
  }
  await ctx.replyWithChatAction("typing").catch(() => {});
  try {
    const text = await runScan(q);
    if (!text) { await ctx.reply("⚪ Couldn't scan that — try the exact name or paste the contract address.", HTML); return; }
    await ctx.reply(text, HTML);
  } catch {
    await ctx.reply("⚠️ Scanner is busy — try again in a moment.", HTML);
  }
});

/* ---------------- Auto-scan: paste a contract, get a verdict ---------------- */

// Per (chat+address) cooldown so a token spammed in chat isn't re-scanned endlessly.
const recent = new Map<string, number>();
const COOLDOWN_MS = 10 * 60_000;
// Light global throttle per chat to avoid a flood of pastes hammering the API.
const lastChatScan = new Map<number, number>();
const CHAT_GAP_MS = 4_000;

function extractAddress(text: string): string | null {
  // EVM first (unambiguous), then base58 (skip obvious non-tokens).
  for (const w of text.split(/\s+/)) {
    const t = w.replace(/[.,;!?]+$/, "");
    if (EVM_RE.test(t)) return t;
  }
  for (const w of text.split(/\s+/)) {
    const t = w.replace(/[.,;!?]+$/, "");
    if (SOL_RE.test(t)) return t;
  }
  return null;
}

autoScan.on("message:text", async (ctx, next) => {
  const text = ctx.message.text;
  // Don't shadow commands (the /scan handler owns those).
  if (!text || text.startsWith("/")) return next();
  // Only in groups/supergroups and private chats — never channels.
  const type = ctx.chat.type;
  if (type !== "group" && type !== "supergroup" && type !== "private") return next();

  const addr = extractAddress(text);
  if (!addr) return next();

  const chatId = ctx.chat.id;
  const now = Date.now();
  const key = `${chatId}:${addr.toLowerCase()}`;
  if (recent.has(key) && now - (recent.get(key) as number) < COOLDOWN_MS) return next();
  if (lastChatScan.has(chatId) && now - (lastChatScan.get(chatId) as number) < CHAT_GAP_MS) return next();
  recent.set(key, now);
  lastChatScan.set(chatId, now);

  await ctx.replyWithChatAction("typing").catch(() => {});
  try {
    const out = await runScan(addr);
    if (!out) return next(); // stay quiet on no-data — don't spam non-tokens
    await ctx.reply(`🛰 <i>Auto-scanned the contract above:</i>\n\n${out}`, {
      ...HTML,
      reply_parameters: { message_id: ctx.message.message_id },
    });
  } catch {
    /* stay quiet on errors — auto path should never nag */
  }
  return next();
});
