"use client";

// Safe Swap under a Solana scan result: buy or sell the scanned token through Jupiter, signed by the
// visitor's own wallet. Buys pass the same safety gate the API enforces (src/lib/swap/gate.ts);
// sells are never blocked. Quotes are fetched on request only (Jupiter's keyless tier is 0.5 RPS).

import { useState } from "react";
import { useWalletApi } from "@/lib/wallet/WalletRoot";
import { swapGate, type SwapSide } from "@/lib/swap/gate";
import { fromAtomic } from "@/lib/swap/amount";
import { ConnectWallet } from "./ConnectWallet";
import styles from "./SafeSwap.module.css";

interface Quote {
  requestId: string;
  transaction: string | null;
  outAmount: string;
  outUsdValue: number | null;
  priceImpactPct: number | null;
  feeBps: number;
  router: string | null;
  error: string | null;
}
interface Order {
  side: SwapSide;
  warning: string | null;
  decimals: { in: number; out: number };
  quote: Quote;
  gl1tchFeeBps: number;
}

type Phase = "idle" | "quoting" | "quoted" | "signing" | "sending" | "done" | "error";

/** A quote's transaction carries a recent blockhash; past this age, ask for a fresh one. */
const QUOTE_TTL_MS = 40_000;
const fmtAmount = (s: string) => Number(s).toLocaleString("en-US", { maximumSignificantDigits: 6 });
const pct = (bps: number) => `${(bps / 100).toFixed(bps % 100 ? 2 : 0)}%`;

const toBytes = (b64: string) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
function toBase64(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

export function SafeSwap({ mint, symbol, verdict, confidence }: { mint: string; symbol: string | null; verdict: string; confidence: number | null }) {
  const { connected, address, signTransaction } = useWalletApi();
  const [side, setSide] = useState<SwapSide>("buy");
  const [amount, setAmount] = useState("");
  const [ack, setAck] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [order, setOrder] = useState<Order | null>(null);
  const [quotedAt, setQuotedAt] = useState(0);
  const [message, setMessage] = useState("");
  const [signature, setSignature] = useState<string | null>(null);

  const ticker = symbol ? `$${symbol}` : "token";
  const gate = swapGate(side, verdict, confidence, ack);
  const blocked = !gate.ok && !gate.needsAck;
  const busy = phase === "quoting" || phase === "signing" || phase === "sending";

  function reset(next?: Partial<{ side: SwapSide; amount: string }>) {
    if (next?.side) setSide(next.side);
    if (next?.amount !== undefined) setAmount(next.amount);
    setOrder(null); setPhase("idle"); setMessage(""); setSignature(null);
  }

  async function quote() {
    if (!address) return;
    setPhase("quoting"); setMessage(""); setOrder(null); setSignature(null);
    try {
      const q = new URLSearchParams({ side, mint, amount, taker: address });
      if (ack) q.set("ack", "1");
      const res = await fetch(`/api/swap/order?${q}`);
      const data = await res.json();
      if (!res.ok) { setMessage(data?.reason || data?.error || "No quote right now."); setPhase("error"); return; }
      const o = data as Order;
      if (!o.quote.transaction) { setMessage(o.quote.error || "Jupiter couldn't build this swap (check your balance)."); setPhase("error"); return; }
      setOrder(o); setQuotedAt(Date.now()); setPhase("quoted");
    } catch { setMessage("Network error. Try again."); setPhase("error"); }
  }

  async function swap() {
    if (!order?.quote.transaction || !signTransaction) return;
    if (Date.now() - quotedAt > QUOTE_TTL_MS) { await quote(); return; }
    setPhase("signing"); setMessage("");
    let signed: Uint8Array;
    try {
      signed = await signTransaction(toBytes(order.quote.transaction));
    } catch { setMessage("Signing was cancelled in your wallet."); setPhase("quoted"); return; }
    setPhase("sending");
    try {
      const res = await fetch("/api/swap/execute", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ signedTransaction: toBase64(signed), requestId: order.quote.requestId }),
      });
      const data = await res.json();
      if (!res.ok || data?.status !== "Success") {
        setSignature(data?.signature ?? null);
        setMessage(data?.error || "The swap didn't land. Nothing left your wallet unless the link below shows it.");
        setPhase("error");
        return;
      }
      setSignature(data.signature); setPhase("done");
    } catch { setMessage("Network error while sending. Check your wallet history before retrying."); setPhase("error"); }
  }

  const outLabel = side === "buy" ? ticker : "SOL";
  const inLabel = side === "buy" ? "SOL" : ticker;

  return (
    <div className={styles.swap}>
      <div className={styles.head}>
        <span className={styles.title}>Safe Swap</span>
        <span className={styles.via}>via Jupiter · your wallet signs</span>
      </div>

      <div className={styles.tabs} role="tablist">
        {(["buy", "sell"] as const).map((s) => (
          <button key={s} type="button" role="tab" aria-selected={side === s} className={`${styles.tab} ${side === s ? styles.tabOn : ""}`} onClick={() => reset({ side: s })} disabled={busy}>
            {s === "buy" ? `Buy ${ticker}` : `Sell ${ticker}`}
          </button>
        ))}
      </div>

      {blocked ? (
        <p className={styles.blocked}>{(gate as { reason: string }).reason}</p>
      ) : (
        <>
          <label className={styles.amountRow}>
            <input
              className={styles.amount}
              inputMode="decimal"
              placeholder="0.0"
              value={amount}
              onChange={(e) => reset({ amount: e.target.value.replace(",", ".").replace(/[^\d.]/g, "") })}
              disabled={busy}
              aria-label={`Amount in ${inLabel}`}
            />
            <span className={styles.unit}>{inLabel}</span>
          </label>

          {side === "buy" && verdict === "CAUTION" && (
            <label className={styles.ack}>
              <input type="checkbox" checked={ack} onChange={(e) => { setAck(e.target.checked); reset(); }} disabled={busy} />
              <span>This token reads CAUTION. I read the warnings above.</span>
            </label>
          )}

          {!connected ? (
            <div className={styles.connect}><ConnectWallet /></div>
          ) : phase === "quoted" || phase === "signing" || phase === "sending" ? (
            order && (
              <div className={styles.quote}>
                <div className={styles.quoteMain}>
                  You get ≈ <strong>{fmtAmount(fromAtomic(order.quote.outAmount, order.decimals.out))} {outLabel}</strong>
                  {order.quote.outUsdValue != null && <span className={styles.usd}> (${order.quote.outUsdValue.toFixed(2)})</span>}
                </div>
                <div className={styles.quoteMeta}>
                  {order.quote.priceImpactPct != null && (
                    <span className={order.quote.priceImpactPct > 1 ? styles.warn : ""}>price impact {order.quote.priceImpactPct.toFixed(2)}%</span>
                  )}
                  <span>total fee {pct(order.quote.feeBps)}</span>
                  {order.quote.router && <span>route {order.quote.router}</span>}
                </div>
                {order.warning && <p className={styles.warnLine}>{order.warning}</p>}
                <button type="button" className={styles.primary} onClick={swap} disabled={busy || !signTransaction}>
                  {phase === "signing" ? "Confirm in your wallet…" : phase === "sending" ? "Sending…" : !signTransaction ? "This wallet can't sign swaps" : `Swap ${amount} ${inLabel}`}
                </button>
                <p className={styles.fee}>
                  {order.gl1tchFeeBps > 0
                    ? `Includes a ${pct(order.gl1tchFeeBps)} GL1TCH fee through Jupiter's referral program (Jupiter keeps a fifth of it). The verdict above is computed before, and without, any fee.`
                    : "No GL1TCH fee on this swap. The fee shown is Jupiter's own."}
                </p>
              </div>
            )
          ) : (
            <button type="button" className={styles.primary} onClick={quote} disabled={busy || !amount || (!gate.ok && gate.needsAck)}>
              {phase === "quoting" ? "Getting a quote…" : "Get quote"}
            </button>
          )}
        </>
      )}

      {phase === "done" && signature && (
        <p className={styles.ok}>
          Swapped. <a href={`https://solscan.io/tx/${signature}`} target="_blank" rel="noreferrer">View on Solscan ↗</a>
        </p>
      )}
      {(phase === "error" || phase === "quoted") && message && (
        <p className={styles.err}>
          {message}
          {signature && <> <a href={`https://solscan.io/tx/${signature}`} target="_blank" rel="noreferrer">Solscan ↗</a></>}
        </p>
      )}
      <p className={styles.note}>
        A clean verdict isn&apos;t a reason to buy, and a swap is your own call. GL1TCH never holds your keys or funds.
      </p>
    </div>
  );
}
