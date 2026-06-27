"use client";

import { useId, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
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
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={panelId}
            role="region"
            aria-labelledby={btnId}
            className={styles.panel}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className={styles.panelInner}>{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
