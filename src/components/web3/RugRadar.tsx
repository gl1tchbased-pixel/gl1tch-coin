"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "./RugRadar.module.css";

/**
 * RugRadar — live "Hall of Shame": tokens the GL1TCH scanner just flagged as risky,
 * pulled from freshly-promoted tokens. Proof the scanner works, on real targets, and a
 * stream of shareable cards. Each links to its full report.
 *
 * Includes a "Live Feed" toggle that connects via Server-Sent Events (`/api/radar/stream`)
 * for real-time sweep and pool-launch updates without manual page reloads.
 */

type Caught = { chain: string; mint: string; name: string; symbol: string; verdict: string; score: number; reason: string; flagged: boolean };
type Radar = { scanned: number; flagged: number; caught: Caught[]; updatedAt?: number };

function vtone(v: string): "good" | "ok" | "warn" | "bad" {
  const u = v.toUpperCase();
  if (u.includes("RUG") || u.includes("HIGH")) return "bad";
  if (u.includes("CAUTION")) return "warn";
  if (u.includes("CLEAN")) return "good";
  return "ok";
}
const short = (a: string) => `${a.slice(0, 4)}…${a.slice(-4)}`;

/** `limit` caps the catches shown (the homepage shows a row; /radar shows the whole sweep). */
export function RugRadar({ limit }: { limit?: number } = {}) {
  const [data, setData] = useState<Radar | null>(null);
  const [err, setErr] = useState(false);
  const [live, setLive] = useState(false);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch("/api/radar")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => { if (alive) setData(d); })
      .catch(() => { if (alive) setErr(true); });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!live || typeof EventSource === "undefined") {
      setConnected(false);
      return;
    }
    const es = new EventSource("/api/radar/stream");
    es.onopen = () => setConnected(true);
    es.addEventListener("radar", (ev) => {
      try {
        const next = JSON.parse((ev as MessageEvent).data) as Radar;
        if (next && Array.isArray(next.caught)) setData(next);
      } catch {
        /* ignore malformed frame */
      }
    });
    es.onerror = () => setConnected(false);
    return () => {
      es.close();
      setConnected(false);
    };
  }, [live]);

  if (err) return <p className={styles.note}>Radar is recharging — try again shortly, or <Link href="/scan" className={styles.link}>scan a token yourself →</Link></p>;

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
      <div className={styles.topBar}>
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

        <button
          type="button"
          onClick={() => setLive((v) => !v)}
          className={`${styles.liveToggle} ${live ? styles.liveActive : ""}`}
          aria-pressed={live}
        >
          <span className={`${styles.liveDot} ${live && connected ? styles.liveDotPulse : ""}`} />
          {live ? (connected ? "Live Feed · ON" : "Connecting SSE…") : "Live Feed · OFF"}
        </button>
      </div>

      {data.caught.length === 0 ? (
        <p className={styles.note}>Radar is mid-sweep — it refreshes hourly. <Link href="/scan" className={styles.link}>Scan one yourself →</Link></p>
      ) : (
        <div className={styles.grid}>
          {data.caught.slice(0, limit ?? data.caught.length).map((c) => {
            const t = vtone(c.verdict);
            return (
              <Link key={c.mint} href={`/scan/${c.chain}-${c.mint}`} className={`${styles.card} ${styles[`t_${t}`]}`}>
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
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
