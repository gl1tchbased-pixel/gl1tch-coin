"use client";

import { useEffect, useState } from "react";
import {
  fetchMarket,
  fmtUsd,
  fmtPrice,
  fmtPct,
  pctTone,
  type MarketSnapshot,
} from "@/lib/market";
import styles from "./LiveStats.module.css";

export function LiveStats() {
  const [snap, setSnap] = useState<MarketSnapshot | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string>("");

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const load = () =>
      fetchMarket(controller.signal).then((s) => {
        if (!active) return;
        setSnap(s);
        setUpdatedAt(new Date().toUTCString().slice(17, 25) + " UTC");
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

  const cards = [
    { label: "Price", value: fmtPrice(snap?.priceUsd ?? null), big: true },
    { label: "24h", value: fmtPct(snap?.priceChange24h ?? null), tone },
    { label: "Market Cap", value: fmtUsd(snap?.marketCap ?? null) },
    { label: "Liquidity", value: fmtUsd(snap?.liquidityUsd ?? null) },
    { label: "24h Volume", value: fmtUsd(snap?.volume24h ?? null) },
  ];

  return (
    <div className={styles.wrap}>
      <div className={styles.stats}>
        {cards.map((c) => (
          <div key={c.label} className={`${styles.stat} ${c.big ? styles.statBig : ""}`}>
            <span className={styles.label}>{c.label}</span>
            <span
              className={`${styles.value} ${
                c.tone === "up" ? styles.up : c.tone === "down" ? styles.down : ""
              }`}
            >
              {snap ? c.value : "···"}
            </span>
          </div>
        ))}
      </div>
      <span className={styles.updated}>
        <span className={styles.dot} aria-hidden="true" />
        {snap ? `Live · refreshed ${updatedAt} · on-chain` : "Connecting to live market…"}
      </span>
    </div>
  );
}
