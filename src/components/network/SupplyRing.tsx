"use client";

import { useEffect, useState } from "react";
import { SceneStage } from "@/components/three/SceneStage";
import { CONTRACT_ADDRESS } from "@/lib/official";
import styles from "./SupplyRing.module.css";

/**
 * The live holder split as a 3D ring: the liquidity pool's share vs everyone else, from the
 * self-scan's largest-account percentage. Pass `poolPct` when the page already has it.
 */
export function SupplyRing({ poolPct: given, className = "" }: { poolPct?: number | null; className?: string }) {
  const [fetched, setFetched] = useState<number | null>(null);
  const [hover, setHover] = useState(-1);
  const pool = given ?? fetched;

  useEffect(() => {
    if (given != null) return;
    let alive = true;
    fetch(`/api/scan?mint=${CONTRACT_ADDRESS}&chain=solana`)
      .then((r) => r.json())
      .then((s) => { if (alive && typeof s?.meta?.topHolderPct === "number") setFetched(s.meta.topHolderPct); })
      .catch(() => {});
    return () => { alive = false; };
  }, [given]);

  if (pool == null) return <div className={[styles.stage, styles.wait, className].join(" ")}><span className="skeleton" aria-hidden="true" /></div>;
  const rest = Math.max(0, 100 - pool);
  const segs = [
    { pct: pool, tone: "pool", label: "Liquidity pool", text: "Tokens waiting in the pool to be bought — not a person." },
    { pct: rest, tone: "rest", label: "Everyone else", text: "Every other wallet combined, including the open market's buyers." },
  ];
  const shown = hover >= 0 ? segs[hover] : null;

  return (
    <SceneStage
      // remount with the new split if it changes
      key={pool.toFixed(2)}
      load={() => import("@/lib/scenes/supplyRing")}
      engine={{ background: "#140d2c", bloom: [0.8, 0.5, 1.0], bokeh: false, backdrop: 1.6, fov: 32 }}
      options={{ segments: segs.map(({ pct, tone }) => ({ pct, tone })) }}
      ui={() => ({ onHover: setHover })}
      className={[styles.stage, className].join(" ")}
      label={`Holder split: liquidity pool ${pool.toFixed(1)}%, everyone else ${rest.toFixed(1)}%`}
    >
      <div className={styles.centre} aria-hidden="true">
        <b>{shown ? `${shown.pct.toFixed(1)}%` : "1B"}</b>
        <span>{shown ? shown.label : "fixed supply"}</span>
      </div>
      <div className={styles.legend} aria-hidden="true">
        <span data-tone="pool">Pool {pool.toFixed(1)}%</span>
        <span data-tone="rest">Everyone else {rest.toFixed(1)}%</span>
      </div>
      {shown && <p className={styles.say}>{shown.text}</p>}
    </SceneStage>
  );
}
