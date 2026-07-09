"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import bs58 from "bs58";
import { drawEntryMessage } from "@/lib/quantum/client";
import { ConnectWallet } from "./ConnectWallet";
import styles from "./DrawEntry.module.css";

type Phase = "idle" | "signing" | "posting" | "done" | "error";

const ERRORS: Record<string, string> = {
  verify_first: "Link your wallet first: run /verify in Telegram so your 7-day balance is on record.",
  insufficient_balance: "You need a sustained Infected+ balance (100K+ $GL1TCH) to enter.",
  already_entered: "This wallet is already entered in the current draw.",
  window_closed: "The entry window just closed. Catch the next draw.",
  draw_closed: "This draw is no longer open for entries.",
  stale: "Your signature expired. Please sign again.",
  bad_signature: "Signature did not match your wallet. Try again.",
  unreachable: "Couldn’t reach the draw service. Try again shortly.",
};

export function DrawEntry({ drawId, open }: { drawId: string; open: boolean }) {
  const { publicKey, signMessage } = useWallet();
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [count, setCount] = useState<number | null>(null);

  async function enter() {
    if (!publicKey || !signMessage) return;
    setError(null);
    setPhase("signing");
    try {
      const issued = Date.now();
      const address = publicKey.toBase58();
      const message = new TextEncoder().encode(drawEntryMessage(address, drawId, issued));
      const sig = await signMessage(message);
      setPhase("posting");
      const res = await fetch("/api/quantum-core/draw/enter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, drawId, issued, signature: bs58.encode(sig) }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(ERRORS[data?.error] ?? "Entry failed. Try again.");
        setPhase("error");
        return;
      }
      setCount(typeof data.count === "number" ? data.count : null);
      setPhase("done");
    } catch {
      setError("Signing was cancelled or failed. Try again.");
      setPhase("error");
    }
  }

  if (!open) {
    return <p className={styles.hint}>Entries are closed for this draw — the winner is being drawn from a future quantum pulse.</p>;
  }

  return (
    <div className={styles.wrap}>
      {!publicKey ? (
        <ConnectWallet />
      ) : phase === "done" ? (
        <p className={styles.ok}>
          You’re in ✓{count !== null ? ` — ${count} wallet${count === 1 ? "" : "s"} entered so far.` : ""} The winner is a
          pure function of a future CURBy quantum pulse + the frozen entry list.
        </p>
      ) : (
        <>
          <button className={styles.button} onClick={enter} disabled={phase === "signing" || phase === "posting" || !signMessage}>
            {phase === "signing" ? "Sign in wallet…" : phase === "posting" ? "Entering…" : "Sign & enter draw (free)"}
          </button>
          <p className={styles.hint}>Signing proves wallet ownership. It moves no funds and grants no access.</p>
        </>
      )}
      {error && <p className={styles.err}>{error}</p>}
    </div>
  );
}
