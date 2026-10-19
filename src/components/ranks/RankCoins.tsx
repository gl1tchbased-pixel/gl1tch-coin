"use client";

import { useEffect, useRef } from "react";
import { SceneStage } from "@/components/three/SceneStage";
import { RANK_TIERS, holdLabel } from "@/lib/ranks";
import { RANK_EVENT, currentRank } from "@/lib/fun/rank-signal";
import { unlock } from "@/lib/fun/achievements";
import { sfx } from "@/lib/fun/sound";
import styles from "./RankCoins.module.css";

interface CoinsApi { highlight: (i: number | null) => void }
const TIERS = RANK_TIERS.map((t) => ({ name: t.rank, hold: holdLabel(t.min), lvl: t.tier }));

/** The five holder tiers as 3D coins. Click to flip; flip all five for the Collector badge. */
export function RankCoins({ className = "" }: { className?: string }) {
  const api = useRef<CoinsApi | null>(null);

  useEffect(() => {
    const on = (e: Event) => api.current?.highlight((e as CustomEvent<number | null>).detail);
    window.addEventListener(RANK_EVENT, on);
    return () => window.removeEventListener(RANK_EVENT, on);
  }, []);

  return (
    <div className={[styles.wrap, className].join(" ")}>
      <SceneStage<CoinsApi>
        load={() => import("@/lib/scenes/rankCoins")}
        engine={{ background: "#170f30", bloom: [0.7, 0.5, 1.0], backdrop: 3.2, fov: 28 }}
        options={{ tiers: TIERS, highlight: currentRank() }}
        ui={() => ({
          onFlip: (_i: number, count: number) => {
            sfx("coin");
            if (count === TIERS.length) unlock("collector");
          },
        })}
        className={styles.stage}
        label={`The five rank coins: ${TIERS.map((t) => `${t.name} ${t.hold}`).join(", ")}`}
        onReady={(a) => { api.current = a; a.highlight(currentRank()); }}
      />
      <ol className={styles.legend}>
        {TIERS.map((t) => (
          <li key={t.name}><b>{t.name}</b><span>{t.hold}</span></li>
        ))}
      </ol>
      <p className={styles.hint}>Click a coin to flip it. Connect a wallet below and your tier steps forward.</p>
    </div>
  );
}
