"use client";

import { useState } from "react";
import { PRIMARY_PAIR } from "@/lib/market";
import { links as officialLinks } from "@/lib/official";
import styles from "./MarketChartEmbed.module.css";

type Provider = "dexscreener" | "geckoterminal";

const SRC: Record<Provider, string> = {
  dexscreener: `https://dexscreener.com/solana/${PRIMARY_PAIR}?embed=1&loadChartSettings=0&theme=dark&chartTheme=dark&trades=0&info=0&chartType=usd&interval=15`,
  geckoterminal: `https://www.geckoterminal.com/solana/pools/${PRIMARY_PAIR}?embed=1&info=0&swaps=0&grayscale=0&light_chart=0&chart_type=price&resolution=15m`,
};

const OPEN: Record<Provider, string> = {
  dexscreener: officialLinks.dexscreener || `https://dexscreener.com/solana/${PRIMARY_PAIR}`,
  geckoterminal: `https://www.geckoterminal.com/solana/pools/${PRIMARY_PAIR}`,
};

export function MarketChartEmbed() {
  // DexScreener dropped the GL1TCH pair (low volume), so its embed is blank —
  // default to GeckoTerminal, which still tracks the pool. DexScreener tab stays
  // for when/if it re-indexes.
  const [provider, setProvider] = useState<Provider>("geckoterminal");

  return (
    <div className={styles.frame}>
      <div className={styles.bar}>
        <span className={styles.pair}>
          <span className={styles.dot} aria-hidden="true" />
          GL1TCH&nbsp;/&nbsp;SOL
        </span>

        <div className={styles.tabs} role="tablist" aria-label="Chart provider">
          <button
            role="tab"
            aria-selected={provider === "dexscreener"}
            className={`${styles.tab} ${provider === "dexscreener" ? styles.active : ""}`}
            onClick={() => setProvider("dexscreener")}
          >
            DexScreener
          </button>
          <button
            role="tab"
            aria-selected={provider === "geckoterminal"}
            className={`${styles.tab} ${provider === "geckoterminal" ? styles.active : ""}`}
            onClick={() => setProvider("geckoterminal")}
          >
            GeckoTerminal
          </button>
        </div>

        <a
          className={styles.open}
          href={OPEN[provider]}
          target="_blank"
          rel="noopener noreferrer"
        >
          Open ↗
        </a>
      </div>

      <div className={styles.viewport}>
        <iframe
          key={provider}
          src={SRC[provider]}
          title="GL1TCH / SOL live price chart"
          className={styles.iframe}
          loading="lazy"
          allow="clipboard-write"
        />
      </div>
    </div>
  );
}
