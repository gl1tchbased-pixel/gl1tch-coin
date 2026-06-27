"use client";

import { useRef } from "react";
import styles from "./Spotlight.module.css";

interface SpotlightProps {
  className?: string;
  children: React.ReactNode;
}

/** Cursor-follow green glow overlay for card groups. */
export function Spotlight({ className = "", children }: SpotlightProps) {
  const ref = useRef<HTMLDivElement>(null);

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - r.left}px`);
    el.style.setProperty("--my", `${e.clientY - r.top}px`);
  };

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      className={[styles.spot, className].filter(Boolean).join(" ")}
    >
      {children}
    </div>
  );
}
