"use client";

import { useState } from "react";
import styles from "@/app/yield/yield.module.css";
import { lpVsHold } from "@/lib/yield/math";
import { money, pct } from "@/lib/yield/format";

const PERIODS = [30, 90, 365] as const;

/**
 * DEX pool calculator: fees at the measured fee APR next to impermanent loss for a price move, against simply
 * holding both tokens. Full-range position, fees not compounded, the fee rate assumed constant (it won't be).
 */
export function LpCalculator({ apr, pair }: { apr: number | null; pair: [string, string] }) {
  const [amount, setAmount] = useState(1000);
  const [days, setDays] = useState<number>(30);
  const [step, setStep] = useState(0); // −100…100 → 0.1×…10× price ratio (log scale)

  if (apr == null) {
    return <p className={styles.p}>The calculator unlocks once GL1TCH has a day of this pool&apos;s fee counters.</p>;
  }

  const ratio = Math.pow(10, step / 100);
  const { lp, hold } = lpVsHold(amount, ratio);
  const fees = amount * apr * (days / 365);
  const net = lp + fees;

  return (
    <div className={styles.calc}>
      <div className={styles.calcRow}>
        <label className={styles.field}>
          Put into the pool (USD)
          <input type="number" min={0} step={100} value={amount} onChange={(e) => setAmount(Math.max(0, Number(e.target.value) || 0))} />
        </label>
        <div className={styles.field}>
          Period
          <div className={styles.filters} style={{ margin: 0 }}>
            {PERIODS.map((d) => (
              <button key={d} type="button" className={styles.chip} aria-pressed={days === d} onClick={() => setDays(d)}>
                {d === 365 ? "1 year" : `${d} days`}
              </button>
            ))}
          </div>
        </div>
        <label className={styles.field}>
          {pair[0]} price vs {pair[1]}: {ratio >= 1 ? "+" : ""}{pct(ratio - 1, 0)}
          <input type="range" min={-100} max={100} step={1} value={step} onChange={(e) => setStep(Number(e.target.value))} aria-label="Price change" />
        </label>
      </div>
      <div className={styles.result}>
        <div className={styles.stat}>
          <div className={styles.statLabel}>In the pool, with fees</div>
          <div className={styles.statValue}>{money(net)}</div>
          <div className={styles.statNote}>{money(fees)} fees at {pct(apr)} for {days} days</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statLabel}>Just holding both</div>
          <div className={styles.statValue}>{money(hold)}</div>
          <div className={styles.statNote}>half in each token</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statLabel}>Pool vs holding</div>
          <div className={styles.statValue} style={{ color: net < hold ? "var(--color-danger)" : "var(--color-signal)" }}>{money(net - hold)}</div>
          <div className={styles.statNote}>impermanent loss {money(lp - hold)}</div>
        </div>
      </div>
    </div>
  );
}
