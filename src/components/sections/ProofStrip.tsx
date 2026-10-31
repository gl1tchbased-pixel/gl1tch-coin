"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchMarket, fmtPrice, fmtPct, pctTone, type MarketSnapshot } from "@/lib/market";
import { TRUST_REPORT } from "@/lib/official";
import styles from "./ProofStrip.module.css";

/**
 * One line of proof under the hero: live price next to the on-chain guarantees that never change
 * (revoked authorities, zero tax, locked LP, RugCheck). Details live on /live and /proof.
 */
export function ProofStrip() {
  const [snap, setSnap] = useState<MarketSnapshot | null>(null);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const load = () => fetchMarket(controller.signal).then((s) => { if (active) setSnap(s); });
    load();
    const id = setInterval(load, 30_000);
    return () => { active = false; controller.abort(); clearInterval(id); };
  }, []);

  const tone = pctTone(snap?.priceChange24h ?? null);
  const facts = [
    TRUST_REPORT.mintRevoked && TRUST_REPORT.freezeRevoked ? { k: "Authorities", v: "Mint & freeze revoked" } : null,
    TRUST_REPORT.zeroTax ? { k: "Tax", v: "0% buy · 0% sell" } : null,
    TRUST_REPORT.lpBurnedOrLocked ? { k: "Liquidity", v: "Pump.fun curve, no LP to pull" } : null,
    TRUST_REPORT.rugcheckScore != null ? { k: "RugCheck", v: `${TRUST_REPORT.rugcheckScore} · ${TRUST_REPORT.rugcheckRiskLevel ?? ""}`.trim() } : null,
  ].filter(Boolean) as { k: string; v: string }[];

  return (
    <section className={styles.strip} aria-label="Live price and on-chain guarantees">
      <div className={`container ${styles.row}`}>
        <Link href="/live" className={`${styles.cell} ${styles.price}`}>
          <span className={styles.k}><i aria-hidden="true" />$GL1TCH live</span>
          <span className={styles.v}>
            {snap ? (
              <>
                {fmtPrice(snap.priceUsd)}{" "}
                <span className={tone === "up" ? styles.up : tone === "down" ? styles.down : ""}>{fmtPct(snap.priceChange24h)}</span>
              </>
            ) : (
              <><span className="skeleton" aria-hidden="true" /><span className="sr-only">Loading</span></>
            )}
          </span>
        </Link>
        {facts.map((f) => (
          <div key={f.k} className={styles.cell}>
            <span className={styles.k}>{f.k}</span>
            <span className={styles.v}><span className={styles.check} aria-hidden="true">✓</span>{f.v}</span>
          </div>
        ))}
        <Link href="/proof" className={styles.more}>Verify every claim →</Link>
      </div>
    </section>
  );
}
