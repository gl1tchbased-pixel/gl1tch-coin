"use client";

import { useEffect, useState } from "react";
import styles from "./RugRadar.module.css";

/**
 * RugRadar — live "Hall of Shame": tokens the GL1TCH scanner just flagged as risky,
 * pulled from freshly-promoted tokens. Proof the scanner works, on real targets, and a
 * stream of shareable cards. Each links to its full report.
 */

type Caught = { chain: string; mint: string; name: string; symbol: string; verdict: string; score: number; reason: string; flagged: boolean };
type Radar = { scanned: number; flagged: number; caught: Caught[] };

function vtone(v: string): "good" | "ok" | "warn" | "bad" {
  const u = v.toUpperCase();
  if (u.includes("RUG") || u.includes("HIGH")) return "bad";
  if (u.includes("CAUTION")) return "warn";
  if (u.includes("CLEAN")) return "good";
  return "ok";
}
const short = (a: string) => `${a.slice(0, 4)}…${a.slice(-4)}`;

export function RugRadar() {
  const [data, setData] = useState<Radar | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch("/api/radar")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => { if (alive) setData(d); })
      .catch(() => { if (alive) setErr(true); });
    return () => { alive = false; };
  }, []);

  if (err) return <p className={styles.note}>Radar is recharging — try again shortly, or <a href="/scan" className={styles.link}>scan a token yourself →</a></p>;

  if (!data) {
    return (
      <div className={styles.loadingWrap}>
        <span className={styles.sweep} />
        <p className={styles.note}>Sweeping freshly-promoted tokens…</p>
      </div>
    );
  }

  return (
    <>
      <div className={styles.counter}>
        <div className={styles.stat}>
          <span className={styles.num}>{data.scanned}</span>
          <span className={styles.lbl}>scanned this sweep</span>
        </div>
        <div className={styles.statSep} />
        <div className={styles.stat}>
          <span className={`${styles.num} ${styles.bad}`}>{data.flagged}</span>
          <span className={styles.lbl}>flagged HIGH RISK+</span>
        </div>
      </div>

      {data.caught.length === 0 ? (
        <p className={styles.note}>Radar is mid-sweep — it refreshes hourly. <a href="/scan" className={styles.link}>Scan one yourself →</a></p>
      ) : (
        <div className={styles.grid}>
          {data.caught.map((c) => {
            const t = vtone(c.verdict);
            return (
              <a key={c.mint} href={`/scan/${c.chain}-${c.mint}`} className={`${styles.card} ${styles[`t_${t}`]}`}>
                {c.flagged && <span className={styles.ribbon}>⚠ CAUGHT</span>}
                <div className={styles.cardTop}>
                  <span className={styles.name}>{c.symbol ? `$${c.symbol}` : c.name}</span>
                  <span className={`${styles.verdict} ${styles[`v_${t}`]}`}>{c.verdict}</span>
                </div>
                <div className={styles.scoreRow}>
                  <span className={`${styles.score} ${styles[`v_${t}`]}`}>{c.score}<span className={styles.scoreMax}>/100</span></span>
                  <span className={styles.addr}>{short(c.mint)}</span>
                </div>
                <div className={styles.reason}>⚠ {c.reason}</div>
                <div className={styles.cta}>full report →</div>
              </a>
            );
          })}
        </div>
      )}
    </>
  );
}
