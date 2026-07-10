"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import bs58 from "bs58";
import { apiKeyMessage, type IssuedKey } from "@/lib/apikey";
import { ConnectWallet } from "./ConnectWallet";
import styles from "./ApiKeyMinter.module.css";

const ERRORS: Record<string, string> = {
  insufficient_balance: "You need a sustained Infected+ balance (100K+ $GL1TCH) to mint an API key.",
  balance_read_failed: "Couldn’t read your balance just now — try again in a moment.",
  stale: "Your signature expired. Please sign again.",
  bad_signature: "Signature did not match your wallet. Try again.",
  unreachable: "Couldn’t reach the key service. Try again shortly.",
};

export function ApiKeyMinter() {
  const { publicKey, signMessage } = useWallet();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<IssuedKey | null>(null);
  const [copied, setCopied] = useState(false);

  async function mint() {
    if (!publicKey || !signMessage) return;
    setBusy(true);
    setErr(null);
    try {
      const issued = Date.now();
      const address = publicKey.toBase58();
      const sig = await signMessage(new TextEncoder().encode(apiKeyMessage(address, issued)));
      const res = await fetch("/api/keys/issue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, issued, signature: bs58.encode(sig) }),
      });
      const data = (await res.json()) as IssuedKey;
      if (!res.ok || !data.ok) {
        setErr(ERRORS[data?.error ?? ""] ?? "Couldn’t mint a key. Try again.");
        return;
      }
      setResult(data);
    } catch {
      setErr("Signing was cancelled or failed. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.box}>
      {!publicKey ? (
        <ConnectWallet />
      ) : result?.ok ? (
        <div className={styles.out}>
          <div className={styles.row}>
            <span className={styles.k}>your tier</span>
            <span className={styles.v}>{result.tierId} · {result.ratePerMin}/min</span>
          </div>
          <div className={styles.row}>
            <span className={styles.k}>API key</span>
            <code className={styles.key}>{result.key}</code>
            <button
              className={styles.copy}
              onClick={() => { navigator.clipboard?.writeText(result.key ?? ""); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
            >
              {copied ? "copied ✓" : "copy"}
            </button>
          </div>
          <p className={styles.usage}>
            Send it as <code>x-gl1tch-key</code> on <code>/api/scan</code> for {result.ratePerMin} requests/min.
            Hold more $GL1TCH to re-mint at a higher tier.
          </p>
        </div>
      ) : (
        <>
          <button className={styles.btn} onClick={mint} disabled={busy || !signMessage}>
            {busy ? "Signing…" : "Mint my API key (free)"}
          </button>
          <p className={styles.hint}>Requires 100K+ $GL1TCH (Infected tier). Signing proves ownership — it moves no funds.</p>
        </>
      )}
      {err && <p className={styles.err}>{err}</p>}
    </div>
  );
}
