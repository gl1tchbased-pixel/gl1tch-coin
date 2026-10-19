"use client";

import { useSyncExternalStore } from "react";
import { ACH_EVENT, ACHIEVEMENTS, ACHIEVEMENT_IDS, unlockedAchievements } from "@/lib/fun/achievements";
import { toast } from "@/lib/fun/glitch";
import { setSound, soundOn, SOUND_EVENT } from "@/lib/fun/sound";
import styles from "./Fun.module.css";

const on = (name: string) => (cb: () => void) => { window.addEventListener(name, cb); return () => window.removeEventListener(name, cb); };
const subAch = on(ACH_EVENT), subSound = on(SOUND_EVENT);

/** Header controls: the Sound toggle (off by default) and the badge counter. */
export function FunControls({ className = "" }: { className?: string }) {
  const count = useSyncExternalStore(subAch, () => unlockedAchievements().length, () => 0);
  const sound = useSyncExternalStore(subSound, soundOn, () => false);

  const showBadges = () => {
    const got = unlockedAchievements();
    const left = ACHIEVEMENT_IDS.filter((id) => !got.includes(id)).map((id) => ACHIEVEMENTS[id].title);
    toast({
      kicker: `Badges · ${got.length}/${ACHIEVEMENT_IDS.length}`,
      title: left.length ? `${left.length} to find` : "All found!",
      text: left.length ? left.join(" · ") : "Ghost Node level.",
    });
  };

  return (
    <div className={[styles.controls, className].join(" ")}>
      <button type="button" className={styles.ctl} aria-pressed={sound} onClick={() => setSound(!sound)} title={sound ? "Sound on" : "Sound off"}>
        <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
          <path d="M3 8h3l4-3.5v11L6 12H3z" fill="currentColor" />
          {sound
            ? <path d="M13 7.2a4 4 0 0 1 0 5.6M15.2 5a7 7 0 0 1 0 10" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" />
            : <path d="M13.5 7.5l4 5m0-5l-4 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />}
        </svg>
        <span className="sr-only">Sound</span>
      </button>
      <button type="button" className={`${styles.ctl} ${styles.badges}`} onClick={showBadges} aria-label={`Badges: ${count} of ${ACHIEVEMENT_IDS.length}`}>
        <svg viewBox="0 0 20 20" width="15" height="15" aria-hidden="true"><path d="M10 2l2.4 4.9 5.4.8-3.9 3.8.9 5.4L10 14.3 5.2 16.9l.9-5.4L2.2 7.7l5.4-.8z" fill="currentColor" /></svg>
        <span className={styles.count} aria-hidden="true">{count}/{ACHIEVEMENT_IDS.length}</span>
      </button>
    </div>
  );
}
