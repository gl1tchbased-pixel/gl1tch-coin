"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  fetchMarket,
  fmtUsd,
  fmtPrice,
  fmtPct,
  pctTone,
  type MarketSnapshot,
} from "@/lib/market";
import { TRUST_REPORT } from "@/lib/official";
import styles from "./TickerBar.module.css";

interface Cell {
  label: string;
  value: string;
  tone?: "up" | "down" | "flat" | "trust";
}

export function TickerBar() {
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

  const cells: Cell[] = [
    { label: "$GL1TCH", value: fmtPrice(snap?.priceUsd ?? null) },
    { label: "24H", value: fmtPct(snap?.priceChange24h ?? null), tone },
    { label: "MCAP", value: fmtUsd(snap?.marketCap ?? null) },
    { label: "LIQ", value: fmtUsd(snap?.liquidityUsd ?? null) },
    { label: "VOL 24H", value: fmtUsd(snap?.volume24h ?? null) },
    { label: "", value: "VERIFIED ON-CHAIN", tone: "trust" },
    { label: "", value: "ZERO TAX", tone: "trust" },
    { label: "", value: "MINT & FREEZE REVOKED", tone: "trust" },
    {
      label: "",
      value: `RUGCHECK ${TRUST_REPORT.rugcheckScore ?? "—"} · ${TRUST_REPORT.rugcheckRiskLevel ?? ""} RISK`,
      tone: "trust",
    },
    { label: "", value: "GIVE-BACK WALLET PUBLIC", tone: "trust" },
  ];

  // Two copies for a seamless marquee loop.
  const loop = [...cells, ...cells];

  return (
    <Link href="/live" className={styles.bar} aria-label="Live market — open live chart">
      <span className={styles.live}>
        <span className={styles.dot} aria-hidden="true" />
        LIVE
      </span>
      <div className={styles.viewport}>
        <div className={styles.track}>
          {loop.map((c, i) => (
            <span key={i} className={styles.cell}>
              {c.tone === "trust" ? (
                <span className={styles.trust}>
                  <span className={styles.check} aria-hidden="true">✓</span>
                  {c.value}
                </span>
              ) : (
                <>
                  {c.label && <span className={styles.label}>{c.label}</span>}
                  <span
                    className={`${styles.value} ${
                      c.tone === "up"
                        ? styles.up
                        : c.tone === "down"
                          ? styles.down
                          : ""
                    }`}
                  >
                    {snap ? c.value : "···"}
                  </span>
                </>
              )}
              <span className={styles.sep} aria-hidden="true">{"//"}</span>
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}
