"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  fetchMarket,
  fmtPrice,
  fmtPct,
  pctTone,
  type MarketSnapshot,
} from "@/lib/market";
import styles from "./HeroPriceChip.module.css";

export function HeroPriceChip() {
  const [snap, setSnap] = useState<MarketSnapshot | null>(null);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const load = () =>
      fetchMarket(controller.signal).then((s) => active && setSnap(s));
    load();
    const id = setInterval(load, 30_000);
    return () => {
      active = false;
      controller.abort();
      clearInterval(id);
    };
  }, []);

  const tone = pctTone(snap?.priceChange24h ?? null);
  const hasPrice = snap?.priceUsd != null;

  return (
    <Link href="/live" className={styles.chip} aria-label="Live price — open live chart">
      <span className={styles.dot} aria-hidden="true" />
      <span className={styles.live}>LIVE</span>
      {hasPrice ? (
        <>
          <span className={styles.price}>{fmtPrice(snap!.priceUsd)}</span>
          {snap!.priceChange24h != null && (
            <span
              className={`${styles.change} ${
                tone === "up" ? styles.up : tone === "down" ? styles.down : ""
              }`}
            >
              {fmtPct(snap!.priceChange24h)}
            </span>
          )}
        </>
      ) : (
        <span className={styles.fallback}>ON SOLANA</span>
      )}
    </Link>
  );
}
