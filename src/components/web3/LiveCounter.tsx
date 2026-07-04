"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import styles from "./LiveCounter.module.css";

/**
 * LiveCounter — the "X tokens scanned · Y rugs caught" hook. Reads the global counter
 * (bot Railway volume) and counts up on view. Proof the scanner is used, not vaporware.
 */

function useCountUp(target: number, run: boolean, ms = 1200) {
  const [n, setN] = useState(0);
  const started = useRef(false);
  useEffect(() => {
    if (!run || started.current || target <= 0) { if (target <= 0) setN(0); return; }
    started.current = true;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / ms);
      setN(Math.round((1 - Math.pow(1 - p, 3)) * target)); // easeOutCubic
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target, run, ms]);
  return n;
}

export function LiveCounter() {
  const [stats, setStats] = useState<{ scanned: number; flagged: number } | null>(null);
  const [seen, setSeen] = useState(false);
  const ref = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    fetch("/api/stats").then((r) => r.json()).then((d) => setStats({ scanned: d.scanned || 0, flagged: d.flagged || 0 })).catch(() => {});
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((e) => { if (e[0].isIntersecting) { setSeen(true); io.disconnect(); } }, { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const scanned = useCountUp(stats?.scanned ?? 0, seen);
  const flagged = useCountUp(stats?.flagged ?? 0, seen);
  const fmt = (x: number) => x.toLocaleString("en-US");

  return (
    <Link ref={ref} href="/radar" className={styles.band} aria-label="Live scanner activity — open Rug Radar">
      <span className={styles.pulse}><span className={styles.dot} /> LIVE</span>
      <div className={styles.stat}>
        <span className={styles.num}>{fmt(scanned)}</span>
        <span className={styles.lbl}>tokens scanned</span>
      </div>
      <span className={styles.x}>·</span>
      <div className={styles.stat}>
        <span className={`${styles.num} ${styles.bad}`}>{fmt(flagged)}</span>
        <span className={styles.lbl}>rugs caught</span>
      </div>
      <span className={styles.cta}>open Rug Radar →</span>
    </Link>
  );
}
