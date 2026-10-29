"use client";

import { useState } from "react";
import styles from "@/app/yield/yield.module.css";
import { impermanentLoss, lpVsHold } from "@/lib/yield/math";
import { money, pct } from "@/lib/yield/format";

/** Drag the price of one token against the other and watch a 50/50 pool position fall behind simply holding. */
export function IlPlayground() {
  const [step, setStep] = useState(0); // −100…100 → price ratio 0.1×…10× (log scale)
  const [amount, setAmount] = useState(1000);
  const ratio = Math.pow(10, step / 100);
  const { lp, hold } = lpVsHold(amount, ratio);
  const il = impermanentLoss(ratio);
  const move = ratio - 1;

  return (
    <div className={styles.calc}>
      <div className={styles.calcRow}>
        <label className={styles.field}>
          Put into the pool (USD)
          <input type="number" min={0} step={100} value={amount} onChange={(e) => setAmount(Math.max(0, Number(e.target.value) || 0))} />
        </label>
        <label className={styles.field}>
          Token price vs. the other side: {move >= 0 ? "+" : ""}{pct(move, 0)} ({ratio.toFixed(2)}×)
          <input type="range" min={-100} max={100} step={1} value={step} onChange={(e) => setStep(Number(e.target.value))} aria-label="Price change" />
        </label>
      </div>
      <div className={styles.result}>
        <div className={styles.stat}>
          <div className={styles.statLabel}>In the pool</div>
          <div className={styles.statValue}>{money(lp)}</div>
          <div className={styles.statNote}>before trading fees</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statLabel}>Just holding both</div>
          <div className={styles.statValue}>{money(hold)}</div>
          <div className={styles.statNote}>half in each token</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statLabel}>Impermanent loss</div>
          <div className={styles.statValue} style={{ color: il < -0.0001 ? "var(--color-danger)" : undefined }}>{pct(il)}</div>
          <div className={styles.statNote}>{money(lp - hold)} vs. holding</div>
        </div>
      </div>
      <p className={styles.p} style={{ margin: 0 }}>
        The pool&apos;s trading fees have to earn back {money(Math.max(0, hold - lp))} just to tie with holding. The APY a DEX shows is
        the fee income; it does not subtract this.
      </p>
    </div>
  );
}
