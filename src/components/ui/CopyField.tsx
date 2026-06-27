"use client";

import { useState } from "react";
import styles from "./CopyField.module.css";

interface CopyFieldProps {
  value: string;
  label?: string;
  /** Placeholder shown when value is empty (e.g. pre-launch). */
  empty?: string;
}

export function CopyField({ value, label, empty }: CopyFieldProps) {
  const [copied, setCopied] = useState(false);

  if (!value) {
    return <code className={`${styles.code} ${styles.emptyState}`}>{empty}</code>;
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1300);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className={styles.row}>
      {label && <span className={styles.label}>{label}</span>}
      <div className={styles.field}>
        <code className={styles.code}>{value}</code>
        <button className={styles.btn} onClick={copy} aria-label="Copy">
          {copied ? "Copied ✓" : "Copy"}
        </button>
      </div>
    </div>
  );
}
