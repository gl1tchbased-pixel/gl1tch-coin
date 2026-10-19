"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import styles from "./TerminalLog.module.css";

export interface LogLine {
  text: string;
  kind?: "ok" | "err" | "muted";
}

interface TerminalLogProps {
  lines: LogLine[];
  /** Rendered after the log finishes typing (e.g. route links). */
  children?: React.ReactNode;
}

const REDUCE = "(prefers-reduced-motion: reduce)";
const subscribeReduce = (cb: () => void) => {
  const m = window.matchMedia(REDUCE);
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
};

export function TerminalLog({ lines, children }: TerminalLogProps) {
  const [count, setCount] = useState(0); // chars revealed in current line
  const [line, setLine] = useState(0); // current line index
  // reduced motion: the whole log at once, no typing
  const reduced = useSyncExternalStore(subscribeReduce, () => window.matchMedia(REDUCE).matches, () => false);
  const done = reduced || line >= lines.length;

  useEffect(() => {
    if (done) return;
    const current = lines[line].text;
    if (count < current.length) {
      const t = setTimeout(() => setCount((c) => c + 1), 18);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => {
      setLine((l) => l + 1);
      setCount(0);
    }, 260);
    return () => clearTimeout(t);
  }, [count, line, done, lines]);

  return (
    <div className={styles.log} aria-live="polite">
      {lines.map((l, i) => {
        if (!reduced && i > line) return null;
        const shown = reduced || i < line ? l.text : l.text.slice(0, count);
        return (
          <p key={i} className={`${styles.line} ${styles[l.kind ?? "muted"]}`}>
            <span className={styles.prompt}>›</span> {shown}
            {!done && i === line && <span className={styles.cursor} />}
          </p>
        );
      })}
      {done && <div className={styles.after}>{children}</div>}
    </div>
  );
}
