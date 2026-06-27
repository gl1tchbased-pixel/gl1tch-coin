import { Composer, type Context } from "grammy";
import type { Bot } from "grammy";
import { Connection, PublicKey } from "@solana/web3.js";
import { config } from "../config.js";
import { capFor } from "./index.js";
import { walletStore, type WalletBaseline, type WalletEntry } from "./wallet-store.js";

/**
 * GL1TCH Watchtower++ — watch a Solana WALLET (a whale, a token's dev, or your own
 * portfolio). The sweep re-reads its holdings and pings you when a position is sold
 * or moved out — whale-exit / dev-sell / portfolio alerts. Read-only.
 */
export const walletCommands = new Composer<Context>();

const HTML = { parse_mode: "HTML" as const, link_preview_options: { is_disabled: true } };
const TOKEN_PROGRAM = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
const TOKEN_2022 = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";
const SOL_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const short = (a: string) => `${a.slice(0, 4)}…${a.slice(-4)}`;
const conn = () => new Connection(config.verify.rpcUrl, "confirmed");

// best-effort symbol cache (DexScreener) so alerts read "$BONK" not a raw mint
const symCache = new Map<string, string>();
async function symbolFor(mint: string): Promise<string> {
  if (symCache.has(mint)) return symCache.get(mint) as string;
  let sym = short(mint);
  try {
    const r = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`, { signal: AbortSignal.timeout(8000) });
    if (r.ok) { const d = (await r.json()) as { pairs?: { baseToken?: { symbol?: string } }[] }; const s = d?.pairs?.[0]?.baseToken?.symbol; if (s) sym = `$${s}`; }
  } catch { /* keep short mint */ }
  symCache.set(mint, sym);
  return sym;
}

async function readWallet(address: string): Promise<WalletBaseline> {
  const c = conn();
  const owner = new PublicKey(address);
  const tokens: Record<string, number> = {};
  for (const pid of [TOKEN_PROGRAM, TOKEN_2022]) {
    const res = await c.getParsedTokenAccountsByOwner(owner, { programId: new PublicKey(pid) });
    for (const { account } of res.value) {
      const info = (account.data as { parsed?: { info?: { mint?: string; tokenAmount?: { uiAmount?: number } } } }).parsed?.info;
      const mint = info?.mint; const amt = info?.tokenAmount?.uiAmount;
      if (mint && typeof amt === "number" && amt > 0) tokens[mint] = (tokens[mint] || 0) + amt;
    }
  }
  const sol = (await c.getBalance(owner)) / 1e9;
  return { sol, tokens };
}

interface Move { mint: string; dropPct: number; gone: boolean }
function diffWallet(prev: WalletBaseline, cur: WalletBaseline): Move[] {
  const moves: Move[] = [];
  for (const [mint, was] of Object.entries(prev.tokens)) {
    const now = cur.tokens[mint] ?? 0;
    if (was > 0 && now < was * 0.75) moves.push({ mint, dropPct: Math.round((1 - now / was) * 100), gone: now <= was * 0.02 });
  }
  return moves.sort((a, b) => b.dropPct - a.dropPct).slice(0, 4);
}

/* ----------------------------- commands ----------------------------- */

walletCommands.command("watchwallet", async (ctx) => {
  const parts = (ctx.match || "").trim().split(/\s+/);
  const addr = parts[0];
  const label = parts.slice(1).join(" ").slice(0, 40);
  const userId = ctx.from?.id;
  if (!userId) return;
  if (!addr) {
    await ctx.reply("🐋 <b>WALLET WATCH</b>\n\nWatch a Solana wallet — a whale, a token's dev, or your own bag. I'll ping you when it sells or moves a position out.\n\n<code>/watchwallet &lt;solana address&gt; [label]</code>\n<code>/wallets</code> · <code>/unwatchwallet &lt;address&gt;</code>", HTML);
    return;
  }
  if (!SOL_RE.test(addr)) { await ctx.reply("⚪ That doesn't look like a Solana wallet address. Wallet watch is Solana-only for now.", HTML); return; }

  const already = walletStore.has(userId, addr);
  const cap = capFor(userId);
  if (!already && walletStore.countByUser(userId) >= cap) {
    await ctx.reply(`🐋 You're watching ${cap} wallets — your limit. Hold $GL1TCH + <code>/verify</code> to unlock more (up to 200).`, HTML);
    return;
  }
  await ctx.replyWithChatAction("typing").catch(() => {});
  let base: WalletBaseline;
  try { base = await readWallet(addr); } catch { await ctx.reply("⚠️ Couldn't read that wallet right now — try again in a moment.", HTML); return; }

  const entry: WalletEntry = { userId, chatId: ctx.chat.id, address: addr, label: label || short(addr), baseline: base, addedAt: Date.now(), lastChecked: Date.now() };
  walletStore.add(entry);
  const n = Object.keys(base.tokens).length;
  await ctx.reply(`🐋 <b>Watching wallet</b> ${label ? `<b>${esc(label)}</b> ` : ""}<code>${short(addr)}</code>.\n${n} token position${n === 1 ? "" : "s"} · ${base.sol.toFixed(2)} SOL.\n\nI'll ping this chat if it sells or moves a position out (checked every few hours).`, HTML);
});

walletCommands.command("wallets", async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;
  const mine = walletStore.listByUser(userId);
  if (!mine.length) { await ctx.reply("🐋 You're not watching any wallets.\n\n<code>/watchwallet &lt;address&gt;</code> to track a whale, a dev, or your own bag.", HTML); return; }
  const lines = mine.map((w) => `• <b>${esc(w.label)}</b> <code>${short(w.address)}</code> · ${Object.keys(w.baseline.tokens).length} positions`);
  await ctx.reply(`🐋 <b>Watched wallets (${mine.length}/${capFor(userId)})</b>\n\n${lines.join("\n")}\n\n<i>I alert you on any sell / move-out.</i>`, HTML);
});

walletCommands.command("unwatchwallet", async (ctx) => {
  const addr = (ctx.match || "").trim();
  const userId = ctx.from?.id;
  if (!userId) return;
  if (!addr) { await ctx.reply("Which wallet? <code>/unwatchwallet &lt;address&gt;</code>", HTML); return; }
  const removed = walletStore.removeByAddress(userId, addr);
  await ctx.reply(removed ? `🚫 Stopped watching <code>${short(removed.address)}</code>.` : "Not in your watched wallets. Try <code>/wallets</code>.", HTML);
});

/* ----------------------------- sweep ----------------------------- */

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function sweepWallets(bot: Bot): Promise<void> {
  const all = walletStore.all();
  if (!all.length) return;
  console.log(`[wallet] sweep: ${all.length} wallets`);
  for (const entry of all) {
    let cur: WalletBaseline | null = null;
    try { cur = await readWallet(entry.address); } catch { cur = null; }
    if (!cur) { await sleep(2000); continue; }
    const moves = diffWallet(entry.baseline, cur);
    if (moves.length) {
      const lines: string[] = [];
      for (const m of moves) {
        const sym = await symbolFor(m.mint);
        lines.push(`• ${m.gone ? `exited <b>${esc(sym)}</b>` : `sold ~${m.dropPct}% of <b>${esc(sym)}</b>`}`);
      }
      const mention = `<a href="tg://user?id=${entry.userId}">your watch</a>`;
      const msg = `🐋 <b>WALLET MOVE</b> — ${mention}\n<code>${short(entry.address)}</code>${entry.label && entry.label !== short(entry.address) ? ` (${esc(entry.label)})` : ""}\n\n${lines.join("\n")}\n\n<i>GL1TCH watched the chain. Not financial advice.</i>`;
      try { await bot.api.sendMessage(entry.chatId, msg, HTML); } catch (e) { console.error("[wallet] alert failed:", (e as Error).message); }
    }
    walletStore.updateBaseline(entry, cur, Date.now());
    await sleep(2000);
  }
}

export function startWalletWatch(): void {
  walletStore.load();
}
