"use client";

import { useEffect, useRef, useState } from "react";
import { SceneStage } from "@/components/three/SceneStage";
import { latestDrandVerified } from "@/lib/quantum/drand-browser";
import type { DrandPulse } from "@/lib/quantum/drand-round";
import { isStale } from "@/lib/staleness";
import styles from "./EntropyField.module.css";

interface FieldApi { round: (hex: string) => void }
const PERIOD_MS = 3000; // drand quicknet publishes a round every 3 s

/** Live drand rounds as a 3D landscape: each new BLS-verified round collapses and rebuilds it. */
export function EntropyField() {
  const api = useRef<FieldApi | null>(null);
  const [pulse, setPulse] = useState<{ p: DrandPulse; at: number } | null>(null);
  const [, tick] = useState(0);
  const lastRound = useRef(0);
  // the newest verified randomness, for a scene that finishes loading after the first round
  const lastHex = useRef<string | null>(null);

  useEffect(() => {
    let alive = true;
    const poll = async () => {
      const p = await latestDrandVerified().catch(() => null);
      if (!alive) return;
      tick((n) => n + 1);
      if (!p || p.round === lastRound.current) return;
      lastRound.current = p.round;
      setPulse({ p, at: Date.now() });
      if (p.verified) { lastHex.current = p.randomness; api.current?.round(p.randomness); }
    };
    void poll();
    const id = setInterval(poll, PERIOD_MS);
    return () => { alive = false; clearInterval(id); };
  }, []);

  const stale = isStale(pulse?.at, 5000);
  return (
    <div className={styles.wrap}>
      <SceneStage<FieldApi>
        load={() => import("@/lib/scenes/entropy")}
        engine={{ background: "#120c26", bloom: [0.95, 0.6, 0.9], bokeh: false, backdrop: 1.8, fov: 38 }}
        className={styles.stage}
        label="Entropy field rebuilt from each live drand round"
        onReady={(a) => { api.current = a; if (lastHex.current) a.round(lastHex.current); }}
      >
        <div className={styles.hud} aria-live="off">
          <span className={styles.src} data-stale={!pulse || stale ? "1" : "0"}><i aria-hidden="true" />
            {pulse ? (stale ? "drand quicknet · reconnecting" : "drand quicknet · live") : "drand quicknet · connecting"}
          </span>
          {pulse && (
            <>
              <span>round <b>{pulse.p.round}</b></span>
              <code>{pulse.p.randomness.slice(0, 12)}…{pulse.p.randomness.slice(-6)}</code>
              <span className={pulse.p.verified ? styles.ok : styles.warn}>{pulse.p.verified ? "BLS-verified in your browser" : "not verified · not drawn"}</span>
            </>
          )}
        </div>
      </SceneStage>
    </div>
  );
}
