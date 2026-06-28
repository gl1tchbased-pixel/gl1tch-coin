"use client";

import { useEffect, useState } from "react";
import styles from "./ProofScan.module.css";

/**
 * ProofScan — live self-scan of $GL1TCH using our OWN scanner API. The whole point:
 * we don't claim we're safe, we run the same public tool on ourselves and show the
 * verdict, auto-updating. "We built the scanner; we pass it live — re-run it yourself."
 */

const CA = "3HQJwwHvzy8pGkPqGQcb4thZCH88MUCHVVSNtHn6pump";

type Check = { key: string; label: string; status: "pass" | "warn" | "fail" | "unknown"; value: string };
type Scan = {
  verdict: string;
  score: number;
  confidence?: number;
  aiVerdict?: string;
  bottomLine?: string;
  checks?: Check[];
};

function tone(verdict: string): "good" | "ok" | "warn" | "bad" {
  const v = verdict.toUpperCase();
  if (v.includes("CLEAN")) return "good";
  if (v.includes("LOW")) return "ok";
  if (v.includes("CAUTION")) return "warn";
  return "bad";
}

const dot = (s: Check["status"]) => (s === "pass" ? styles.dGood : s === "fail" ? styles.dBad : s === "warn" ? styles.dWarn : styles.dUnk);

export function ProofScan() {
  const [scan, setScan] = useState<Scan | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch(`/api/scan?mint=${CA}&chain=solana`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => { if (alive) setScan(d); })
      .catch(() => { if (alive) setErr(true); });
    return () => { alive = false; };
  }, []);

  if (err) {
    return (
      <div className={styles.card}>
        <div className={styles.headRow}>
          <span className={styles.live}>● LIVE SELF-SCAN</span>
        </div>
        <p className={styles.aiText}>
          Scanner is busy right now — run it yourself:{" "}
          <a className={styles.inlineLink} href={`/scan/solana-${CA}`}>open the live report →</a>
        </p>
      </div>
    );
  }

  if (!scan) {
    return (
      <div className={styles.card}>
        <div className={styles.headRow}>
          <span className={styles.live}>● LIVE SELF-SCAN</span>
          <span className={styles.loading}>reading the chain…</span>
        </div>
        <div className={styles.skeleton} />
      </div>
    );
  }

  const t = tone(scan.verdict);
  const checks = scan.checks ?? [];

  return (
    <div className={`${styles.card} ${styles[`tone_${t}`]}`}>
      <div className={styles.headRow}>
        <span className={styles.live}>● LIVE SELF-SCAN · $GL1TCH</span>
        {scan.confidence != null && <span className={styles.conf}>{scan.confidence}% confidence</span>}
      </div>

      <div className={styles.verdictRow}>
        <div className={styles.score}>{scan.score}<span className={styles.scoreMax}>/100</span></div>
        <div className={styles.verdictWrap}>
          <div className={`${styles.verdict} ${styles[`vt_${t}`]}`}>{scan.verdict}</div>
          {scan.bottomLine && <div className={styles.bottomLine}>{scan.bottomLine}</div>}
        </div>
      </div>

      {scan.aiVerdict && (
        <p className={styles.aiText}>
          <span className={styles.aiTag}>GL1TCH reads:</span> {scan.aiVerdict}
        </p>
      )}

      {checks.length > 0 && (
        <ul className={styles.checks}>
          {checks.map((c) => (
            <li key={c.key} className={styles.checkRow}>
              <span className={`${styles.cdot} ${dot(c.status)}`} />
              <span className={styles.cLabel}>{c.label}</span>
              <span className={`${styles.cVal} ${dot(c.status)}`}>{c.value}</span>
            </li>
          ))}
        </ul>
      )}

      <div className={styles.actions}>
        <a className={styles.btnPrimary} href={`/scan/solana-${CA}`}>Open full report →</a>
        <a className={styles.btnGhost} href="/scan">Re-scan it yourself</a>
      </div>
    </div>
  );
}
