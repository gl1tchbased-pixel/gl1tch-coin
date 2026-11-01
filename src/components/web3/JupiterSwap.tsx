"use client";

import { useEffect, useState } from "react";
import Script from "next/script";

const SOL_MINT = "So11111111111111111111111111111111111111112";
const TARGET_ID = "jupiter-plugin";

declare global {
  interface Window {
    Jupiter?: {
      init: (props: Record<string, unknown>) => void;
      close?: () => void;
    };
  }
}

/** Jupiter's own swap form: its code builds the swap and talks to the wallet, so ours never signs anything.
 *  The token is locked, so the scan that let the visitor in is the scan of what they can buy. */
export function JupiterSwap({ mint, referralAccount, referralFeeBps }: { mint: string; referralAccount?: string; referralFeeBps?: number }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => () => window.Jupiter?.close?.(), []);

  const init = () => {
    if (!window.Jupiter) return setFailed(true);
    window.Jupiter.init({
      displayMode: "integrated",
      integratedTargetId: TARGET_ID,
      formProps: {
        initialInputMint: SOL_MINT,
        initialOutputMint: mint,
        fixedMint: mint,
        ...(referralAccount && referralFeeBps ? { referralAccount, referralFee: referralFeeBps } : {}),
      },
    });
  };

  return (
    <>
      <Script src="https://plugin.jup.ag/plugin-v1.js" strategy="afterInteractive" onReady={init} onError={() => setFailed(true)} />
      {failed ? (
        <p>
          Jupiter&apos;s swap form didn&apos;t load.{" "}
          <a href={`https://jup.ag/swap/SOL-${encodeURIComponent(mint)}`} target="_blank" rel="noreferrer">
            Swap on Jupiter directly ↗
          </a>{" "}
          (no GL1TCH fee).
        </p>
      ) : (
        <div id={TARGET_ID} style={{ minHeight: 568 }} />
      )}
    </>
  );
}
