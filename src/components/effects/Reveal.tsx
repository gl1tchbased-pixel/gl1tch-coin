"use client";

import { useEffect, useRef } from "react";
import styles from "./Reveal.module.css";

interface RevealProps {
  as?: "div" | "section" | "li";
  className?: string;
  delay?: number;
  children: React.ReactNode;
}

/**
 * Scroll-in for sections, as progressive enhancement: the server renders the content fully
 * visible, and only after hydration is a block that is still below the fold tucked away, to slide
 * in when it scrolls into view. Nothing on screen is ever hidden waiting for JavaScript (the old
 * framer-motion version server-rendered at opacity 0 + blur, which held back first paint and LCP).
 */
export function Reveal({ as = "div", className = "", delay = 0, children }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = el.getBoundingClientRect();
    if (r.top < window.innerHeight && r.bottom > 0) return; // already visible: leave it alone
    el.dataset.reveal = "pending";
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        el.dataset.reveal = "shown";
        io.disconnect();
      },
      // fires as the block's top edge enters the lower 90% of the screen, however tall it is
      { rootMargin: "0px 0px -10% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const Tag = as as "div";
  return (
    <Tag
      ref={ref}
      className={[styles.reveal, className].join(" ")}
      style={delay ? ({ "--reveal-delay": `${delay}ms` } as React.CSSProperties) : undefined}
    >
      {children}
    </Tag>
  );
}
