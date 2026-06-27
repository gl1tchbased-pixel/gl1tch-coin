"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./StatsCounter.module.css";

interface Stat {
  id: string;
  target: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  label: string;
  display?: string; // overrides numeric formatting for non-animated values
}

const STATS: Stat[] = [
  { id: "stat-tax", target: 0, suffix: "%", label: "Buy / Sell Tax" },
  { id: "stat-supply", target: 1, suffix: "B", label: "Fixed Supply (no inflation)" },
  { id: "stat-renounce", target: 100, suffix: "%", label: "Authorities Revoked" },
  { id: "stat-ranks", target: 5, label: "Rank Tiers" },
];

function useCountUp(target: number, run: boolean, decimals = 0) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!run) return;
    if (typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setValue(target);
      return;
    }
    const duration = 1100;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(target * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, run, decimals]);
  return value;
}

function StatItem({ stat, run }: { stat: Stat; run: boolean }) {
  const value = useCountUp(stat.target, run, stat.decimals);
  const shown = value.toFixed(stat.decimals ?? 0);
  return (
    <div className={styles.item} id={stat.id}>
      <span className={styles.value}>
        {stat.prefix}
        {shown}
        {stat.suffix}
      </span>
      <span className={styles.label}>{stat.label}</span>
    </div>
  );
}

export function StatsCounter() {
  const ref = useRef<HTMLDivElement>(null);
  const [run, setRun] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setRun(true);
          obs.disconnect();
        }
      },
      { threshold: 0.4 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <section className={styles.section} aria-label="Key facts">
      <div ref={ref} className={`container ${styles.grid}`}>
        {STATS.map((stat) => (
          <StatItem key={stat.id} stat={stat} run={run} />
        ))}
      </div>
    </section>
  );
}
