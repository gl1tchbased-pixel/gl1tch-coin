"use client";

import { useEffect, useRef } from "react";
import { SceneStage } from "@/components/three/SceneStage";
import { verdictKind } from "@/lib/verdict";
import styles from "./RiskOrb.module.css";

interface OrbApi { setScore: (score: number) => void }

/** The scan score as a 3D object: smooth green glass when clean, spiked red and shedding voxels when risky. */
export function RiskOrb({ score, verdict }: { score: number; verdict: string }) {
  const api = useRef<OrbApi | null>(null);
  useEffect(() => { api.current?.setScore(score); }, [score]);
  const kind = verdictKind(verdict);

  return (
    <SceneStage<OrbApi>
      load={() => import("@/lib/scenes/riskOrb")}
      engine={{ background: kind === "bad" ? "#2a0f1d" : kind === "warn" ? "#231a12" : "#1a1036", bloom: [0.75, 0.5, 1.0], backdrop: 1.4 }}
      options={{ score }}
      className={styles.stage}
      label={`Risk orb: ${verdict} ${score} out of 100`}
      onReady={(a) => { api.current = a; a.setScore(score); }}
    >
      <div className={styles.read} data-kind={kind} aria-hidden="true">
        <span className={styles.score}>{score}<small>/100</small></span>
        <span className={styles.verdict}>{verdict}</span>
      </div>
    </SceneStage>
  );
}
