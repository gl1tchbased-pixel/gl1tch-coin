"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Reveal } from "@/components/effects/Reveal";
import {
  fetchMarket,
  fmtUsd,
  fmtPrice,
  fmtPct,
  pctTone,
  PRIMARY_PAIR,
  type MarketSnapshot,
} from "@/lib/market";
import { CONTRACT_ADDRESS, links as officialLinks } from "@/lib/official";
import shared from "./shared.module.css";
import styles from "./LiveMarket.module.css";

const JUP_SWAP = CONTRACT_ADDRESS
  ? `https://jup.ag/swap/SOL-${CONTRACT_ADDRESS}`
  : "https://jup.ag";
const BIRDEYE = CONTRACT_ADDRESS
  ? `https://birdeye.so/token/${CONTRACT_ADDRESS}?chain=solana`
  : "https://birdeye.so";
const GECKO = `https://www.geckoterminal.com/solana/pools/${PRIMARY_PAIR}`;
// GeckoTerminal embed — DexScreener delisted the low-volume pair, so its iframe
// renders blank. GeckoTerminal still serves the live chart for the same pool.
const CHART_EMBED = `https://www.geckoterminal.com/solana/pools/${PRIMARY_PAIR}?embed=1&info=0&swaps=0&grayscale=0&light_chart=0&chart_type=price&resolution=15m`;

const VERIFY_LINKS = [
  { label: "Solscan", href: officialLinks.explorer },
  { label: "RugCheck", href: officialLinks.rugcheck },
  { label: "DexScreener", href: officialLinks.dexscreener },
  { label: "GeckoTerminal", href: GECKO },
  { label: "Birdeye", href: BIRDEYE },
].filter((l) => l.href);

export function LiveMarket() {
  const [snap, setSnap] = useState<MarketSnapshot | null>(null);
  const [showChart, setShowChart] = useState(false);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const load = () =>
      fetchMarket(controller.signal).then((s) => {
        if (active) setSnap(s);
      });
    load();
    const id = setInterval(load, 30_000);
    return () => {
      active = false;
      controller.abort();
      clearInterval(id);
    };
  }, []);

  const tone = pctTone(snap?.priceChange24h ?? null);
  const hasData =
    !!snap &&
    (snap.priceUsd != null ||
      snap.marketCap != null ||
      snap.volume24h != null);

  const cards = [
    { id: "lm-price", label: "Price", value: fmtPrice(snap?.priceUsd ?? null) },
    {
      id: "lm-change",
      label: "24h",
      value: fmtPct(snap?.priceChange24h ?? null),
      tone,
    },
    { id: "lm-mcap", label: "Market Cap", value: fmtUsd(snap?.marketCap ?? null) },
    {
      id: "lm-liq",
      label: "Liquidity",
      value: fmtUsd(snap?.liquidityUsd ?? null),
    },
    {
      id: "lm-vol",
      label: "24h Volume",
      value: fmtUsd(snap?.volume24h ?? null),
    },
  ];

  return (
    <section className={`${shared.section} ${shared.alt}`} id="live" aria-label="Live market">
      <div className="container">
        <Reveal className={shared.head}>
          <span className={shared.eyebrow}>
            <span className={styles.pulse} aria-hidden="true" /> Live Market
          </span>
          <h2 className={shared.title}>Real Numbers. On-Chain. Right Now.</h2>
          <p className={shared.body}>
            Pulled live on-chain every 30 seconds — no screenshots, no stale
            claims. Trade and verify through the official venues below.
          </p>
        </Reveal>

        <Reveal className={styles.stats}>
          {cards.map((c) => (
            <div key={c.id} id={c.id} className={styles.stat} data-tone={c.tone}>
              <span className={styles.statLabel}>{c.label}</span>
              <span
                className={`${styles.statValue} ${
                  c.tone === "up"
                    ? styles.up
                    : c.tone === "down"
                      ? styles.down
                      : ""
                }`}
              >
                {snap ? c.value : "···"}
              </span>
            </div>
          ))}
        </Reveal>

        {!hasData && snap && (
          <Reveal className={styles.warming}>
            Live data is warming up. Open the{" "}
            <a href={GECKO} target="_blank" rel="noopener noreferrer">
              GeckoTerminal chart ↗
            </a>{" "}
            for the latest tape.
          </Reveal>
        )}

        <Reveal className={styles.actions}>
          <a className={styles.buy} href={JUP_SWAP} target="_blank" rel="noopener noreferrer">
            Buy on Jupiter
          </a>
          {officialLinks.pumpfun && (
            <a
              className={styles.buyAlt}
              href={officialLinks.pumpfun}
              target="_blank"
              rel="noopener noreferrer"
            >
              Buy on Pump.fun
            </a>
          )}
          <button
            type="button"
            className={styles.chartToggle}
            onClick={() => setShowChart((v) => !v)}
            aria-expanded={showChart}
          >
            {showChart ? "Hide chart" : "View live chart"}
          </button>
        </Reveal>

        {showChart && (
          <div className={styles.chartWrap}>
            <iframe
              src={CHART_EMBED}
              title="GL1TCH / SOL live chart"
              className={styles.chart}
              loading="lazy"
            />
          </div>
        )}

        <Reveal className={styles.listed}>
          <span className={styles.listedLabel}>Tracked &amp; verifiable on</span>
          <div className={styles.listedRow}>
            {VERIFY_LINKS.map((l) => (
              <a
                key={l.label}
                href={l.href}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.badge}
              >
                {l.label} ↗
              </a>
            ))}
          </div>
          <Link href="/links" className={styles.allLinks} id="live-links">
            All official links &amp; contract →
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
