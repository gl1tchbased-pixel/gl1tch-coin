"use client";

import { useEffect, useState } from "react";
import styles from "@/app/whitepaper/whitepaper.module.css";

interface Item {
  id: string;
  title: string;
}

export function WhitepaperNav({ items }: { items: Item[] }) {
  const [active, setActive] = useState(items[0]?.id ?? "");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-96px 0px -65% 0px", threshold: 0 }
    );
    items.forEach((it) => {
      const el = document.getElementById(it.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [items]);

  return (
    <nav className={`${styles.toc} no-print`} aria-label="Whitepaper contents">
      <span className={styles.tocLabel}>Contents</span>
      <ol className={styles.tocList}>
        {items.map((s) => (
          <li key={s.id}>
            <a
              href={`#${s.id}`}
              className={active === s.id ? styles.tocActive : ""}
              aria-current={active === s.id ? "true" : undefined}
            >
              {s.title}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
