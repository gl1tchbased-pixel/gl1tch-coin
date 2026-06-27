"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import bs58 from "bs58";
import { verificationMessage, BOT_VERIFY_URL } from "@/lib/verify";
import { ConnectWallet } from "./ConnectWallet";
import styles from "./RankChecker.module.css";

type Phase = "idle" | "signing" | "posting" | "done" | "error";

interface Result {
  rank: string;
  balance: number;
  unlocks: string;
  preLaunch: boolean;
}

const ERRORS: Record<string, string> = {
  invalid_or_expired_nonce: "This verification link expired or was already used. Run /verify in Telegram again.",
  bad_signature: "Signature did not match your wallet. Please try again.",
  bad_request: "Malformed request. Run /verify in Telegram again.",
  rate_limited: "Too many attempts. Wait a minute and retry.",
  internal: "Something went wrong reading your balance. Try again shortly.",
};

export function VerifyClient() {
  const { publicKey, signMessage, connected } = useWallet();
  const [nonce, setNonce] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const n = new URLSearchParams(window.location.search).get("n");
    setNonce(n);
  }, []);

  async function verify() {
    if (!nonce || !publicKey || !signMessage) return;
    setError(null);
    setPhase("signing");
    try {
      const message = new TextEncoder().encode(verificationMessage(nonce));
      const sig = await signMessage(message);
      setPhase("posting");
      const res = await fetch(BOT_VERIFY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nonce,
          publicKey: publicKey.toBase58(),
          signature: bs58.encode(sig),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(ERRORS[data?.error] ?? "Verification failed. Try again.");
        setPhase("error");
        return;
      }
      setResult({
        rank: data.rank,
        balance: data.balance,
        unlocks: data.unlocks,
        preLaunch: data.preLaunch,
      });
      setPhase("done");
    } catch {
      setError("Signing was cancelled or failed. Try again.");
      setPhase("error");
    }
  }

  if (!BOT_VERIFY_URL) {
    return (
      <div className={styles.panel}>
        <p className={styles.lead}>
          Rank verification activates at launch. Come back once $GL1TCH is live.
        </p>
      </div>
    );
  }

  if (!nonce) {
    return (
      <div className={styles.panel}>
        <p className={styles.lead}>
          Start verification from Telegram: open the GL1TCH bot and tap <b>/verify</b>.
          It will send you a one-time link back here.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.panel}>
      {phase === "done" && result ? (
        <div className={styles.result}>
          <span className={styles.rankLabel}>Verified</span>
          <span className={styles.rankName}>{result.rank}</span>
          {result.preLaunch ? (
            <span className={styles.next}>
              Token not live yet — ranks activate at launch. Re-verify after launch.
            </span>
          ) : (
            <span className={styles.balance}>
              {result.balance.toLocaleString("en-US")} $GL1TCH
            </span>
          )}
          <span className={styles.next}>
            Check your Telegram DMs — your rank and any room links are there.
          </span>
        </div>
      ) : !connected ? (
        <div className={styles.connect}>
          <p className={styles.lead}>
            Connect your Solana wallet, then sign a free message to prove you hold
            $GL1TCH. No funds ever move.
          </p>
          <ConnectWallet />
        </div>
      ) : (
        <div className={styles.connect}>
          <p className={styles.lead}>
            {phase === "signing"
              ? "Approve the signature in your wallet…"
              : phase === "posting"
                ? "Verifying your holdings…"
                : "Wallet connected. Sign the message to verify your rank."}
          </p>
          {error && <p className={styles.lead}>{error}</p>}
          <button
            className={styles.retry}
            onClick={verify}
            disabled={phase === "signing" || phase === "posting" || !signMessage}
          >
            {phase === "error" ? "Try again" : "Sign & verify"}
          </button>
          {!signMessage && (
            <span className={styles.status}>
              This wallet does not support message signing.
            </span>
          )}
        </div>
      )}
    </div>
  );
}
