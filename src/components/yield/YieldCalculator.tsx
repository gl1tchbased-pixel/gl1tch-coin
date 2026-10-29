"use client";

import { useState } from "react";
import styles from "@/app/yield/yield.module.css";
import { breakEvenDays, scenario } from "@/lib/yield/math";
import { money, pct } from "@/lib/yield/format";

const PERIODS = [30, 90, 365] as const;

/**
 * "What does this mean for my money?" — the yield next to simply holding, with a price move for non-stable
 * assets and the one-off cost of getting in and out. Assumes the measured APY stays as it is (it won't).
 */
export function YieldCalculator({ apy, stable, symbol, defaultCostUsd, costNote }: { apy: number | null; stable: boolean; symbol: string; defaultCostUsd: number; costNote: string }) {
  const [amount, setAmount] = useState(1000);
  const [days, setDays] = useState<number>(365);
  const [move, setMove] = useState(0);
  const [cost, setCost] = useState(Math.round(defaultCostUsd * 100) / 100);

  if (apy == null) {
    return <p className={styles.p}>The calculator unlocks once GL1TCH has measured this yield (at least a day of its own snapshots).</p>;
  }

  const s = scenario({ amount, apy, days, priceChange: move / 100, stable });
  const net = s.withYield - cost;
  const be = breakEvenDays(cost, amount, apy);

  return (
    <div className={styles.calc}>
      <div className={styles.calcRow}>
        <label className={styles.field}>
          Amount (USD)
          <input type="number" min={0} step={50} value={amount} onChange={(e) => setAmount(Math.max(0, Number(e.target.value) || 0))} />
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
        {!stable && (
          <label className={styles.field}>
            {symbol} price change: {move > 0 ? "+" : ""}{move}%
            <input type="range" min={-80} max={100} step={5} value={move} onChange={(e) => setMove(Number(e.target.value))} />
          </label>
        )}
        <label className={styles.field}>
          Entry + exit cost (USD)
          <input type="number" min={0} step={0.5} value={cost} onChange={(e) => setCost(Math.max(0, Number(e.target.value) || 0))} />
        </label>
      </div>
      <p className={styles.dim} style={{ margin: 0 }}>{costNote}</p>

      <div className={styles.result}>
        <div className={styles.stat}>
          <div className={styles.statLabel}>With the yield</div>
          <div className={styles.statValue}>{money(net)}</div>
          <div className={styles.statNote}>after the entry + exit cost</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statLabel}>Just holding</div>
          <div className={styles.statValue}>{money(s.holdOnly)}</div>
          <div className={styles.statNote}>{stable ? "a stablecoin stays at its dollar value" : `${symbol} ${move >= 0 ? "+" : ""}${move}%`}</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statLabel}>Yield earned</div>
          <div className={styles.statValue}>{money(s.yieldUsd)}</div>
          <div className={styles.statNote}>{pct(apy)} for {days} days</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statLabel}>Pays back the cost in</div>
          <div className={styles.statValue}>{be == null ? "never" : be < 1 ? "< 1 day" : `${Math.ceil(be)} days`}</div>
          <div className={styles.statNote}>at today&apos;s APY</div>
        </div>
      </div>
      {!stable && move < 0 && s.withYield - cost < amount && (
        <p className={styles.p} style={{ margin: 0 }}>
          The yield doesn&apos;t cover a {Math.abs(move)}% price drop: staking rewards are paid in {symbol}, so they fall with it.
        </p>
      )}
    </div>
  );
}
