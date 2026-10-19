"use client";

import { useEffect, useRef, useState } from "react";
import { ACH_EVENT, ACHIEVEMENTS, type AchievementEvent } from "@/lib/fun/achievements";
import { bigGlitch, TOAST_EVENT, type ToastDetail } from "@/lib/fun/glitch";
import { sfx } from "@/lib/fun/sound";
import styles from "./Fun.module.css";

const PIXELS = ".XXX.XX.XXX.X.XXX.XX.XXX.".split("");
interface Toast extends ToastDetail { key: number; leaving?: boolean }

/** Badge toasts and the secret code. Mounted once in the root layout. */
export function FunLayer() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seq = useRef(0);

  useEffect(() => {
    const push = (t: ToastDetail, ms = 4200) => {
      const key = ++seq.current;
      setToasts((list) => [...list.slice(-2), { ...t, key }]);
      window.setTimeout(() => setToasts((list) => list.map((x) => (x.key === key ? { ...x, leaving: true } : x))), ms);
      window.setTimeout(() => setToasts((list) => list.filter((x) => x.key !== key)), ms + 420);
    };
    const onAch = (e: Event) => {
      const { id, count, total } = (e as CustomEvent<AchievementEvent>).detail;
      sfx("ach");
      push({ kicker: `Badge unlocked · ${count}/${total}`, title: ACHIEVEMENTS[id].title, text: ACHIEVEMENTS[id].text });
    };
    const onToast = (e: Event) => push((e as CustomEvent<ToastDetail>).detail, 3600);

    let buf = "";
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t?.closest?.("input, textarea, select, [contenteditable='true']") || e.key.length !== 1 || e.metaKey || e.ctrlKey || e.altKey) return;
      buf = (buf + e.key.toLowerCase()).slice(-6);
      if (buf === "glitch") { buf = ""; bigGlitch(); }
    };
    let clicks = 0, lastClick = 0;
    const onClick = (e: MouseEvent) => {
      if (!(e.target as HTMLElement | null)?.closest?.("[data-egg='logo']")) return;
      const now = Date.now();
      clicks = now - lastClick < 700 ? clicks + 1 : 1;
      lastClick = now;
      if (clicks >= 5) { clicks = 0; bigGlitch(); }
    };

    window.addEventListener(ACH_EVENT, onAch);
    window.addEventListener(TOAST_EVENT, onToast);
    document.addEventListener("keydown", onKey);
    document.addEventListener("click", onClick);
    return () => {
      window.removeEventListener(ACH_EVENT, onAch);
      window.removeEventListener(TOAST_EVENT, onToast);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("click", onClick);
    };
  }, []);

  return (
    <div className={styles.toasts} role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.key} className={styles.toast} data-leaving={t.leaving ? "1" : undefined}>
          <span className={styles.px} aria-hidden="true">
            {PIXELS.map((c, i) => <i key={i} data-off={c === "." ? "1" : undefined} />)}
          </span>
          <span>
            <small>{t.kicker}</small>
            <b>{t.title}</b>
            <span>{t.text}</span>
          </span>
        </div>
      ))}
    </div>
  );
}
