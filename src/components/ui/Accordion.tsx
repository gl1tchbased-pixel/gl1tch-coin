"use client";

import { useId, useState } from "react";
import styles from "./Accordion.module.css";

interface AccordionProps {
  id?: string;
  title: string;
  defaultOpen?: boolean;
  className?: string;
  children: React.ReactNode;
}

export function Accordion({
  id,
  title,
  defaultOpen = false,
  className = "",
  children,
}: AccordionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const reactId = useId();
  const panelId = `${id ?? reactId}-panel`;
  const btnId = `${id ?? reactId}-button`;

  return (
    <div className={[styles.item, open ? styles.open : "", className].filter(Boolean).join(" ")}>
      <button
        id={btnId}
        className={styles.header}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        <span className={styles.title}>{title}</span>
        <span className={styles.icon} aria-hidden="true">
          {open ? "−" : "+"}
        </span>
      </button>
      {/* Always in the HTML (answers stay crawlable); CSS grid rows animate the height, and the
          closed panel is visibility:hidden so it's out of the tab order and the accessibility tree. */}
      <div id={panelId} role="region" aria-labelledby={btnId} className={styles.panel}>
        <div className={styles.panelClip}>
          <div className={styles.panelInner}>{children}</div>
        </div>
      </div>
    </div>
  );
}
