"use client";

import { useRef } from "react";
import { GlitchyStage, type GlitchyAction, type GlitchyStageHandle } from "@/components/glitchy/GlitchyStage";
import shared from "./shared.module.css";
import styles from "./MeetGlitchy.module.css";

const ACTIONS: { id: GlitchyAction; label: string }[] = [
  { id: "laugh", label: "Laugh" },
  { id: "wave", label: "Wave" },
  { id: "hop", label: "Hop" },
  { id: "spin", label: "Spin" },
  { id: "wink", label: "Wink" },
  { id: "glitch", label: "Glitch" },
];

/**
 * Mascot v3 — Chrome and Shadow editions, rendered live in the browser. They look around, follow the
 * cursor, react to clicks and perform on demand; the buttons drive both at once.
 */
export function MeetGlitchy() {
  const stage = useRef<GlitchyStageHandle>(null);
  return (
    <section className={shared.section} id="glitchy" aria-labelledby="glitchy-title">
      <div className={`container ${styles.grid}`}>
        <div className={styles.copy}>
          <span className={shared.eyebrow}>Mascot v3</span>
          <h2 id="glitchy-title" className={shared.title}>
            Meet Glitchy. <span className={styles.signal}>The signal has a face.</span>
          </h2>
          <p className={shared.body}>
            Two editions, Chrome and Shadow, rendered live in your browser. Move your mouse or finger anywhere
            and they follow it. Click or tap for a reaction, drag to spin. Real-time 3D we built in-house: no
            video, no gif.
          </p>
          <div className={styles.actions} role="group" aria-label="Make Glitchy perform">
            {ACTIONS.map((a) => (
              <button key={a.id} id={`glitchy-${a.id}`} type="button" className={styles.action} onClick={() => stage.current?.play(a.id)}>
                {a.label}
              </button>
            ))}
          </div>
        </div>

        <figure className={styles.figure}>
          <GlitchyStage
            ref={stage}
            className={styles.stage}
            characters={[
              { edition: "chrome", x: -1.45, y: 0, scale: 1, yaw: 0.22 },
              { edition: "shadow", x: 1.45, y: 0, scale: 1, yaw: -0.22 },
            ]}
            camera={{ position: [0, 0.1, 9.6], target: [0, -0.3, 0] }}
            background="#14121c"
            poster="/brand/glitchy-v3/glitchy-duo-hero.png"
            posterAlt="Glitchy mascot, Chrome and Shadow editions"
          />
          <figcaption className={styles.caption}>
            <span>Chrome edition</span>
            <span className={styles.purple}>Shadow edition</span>
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
