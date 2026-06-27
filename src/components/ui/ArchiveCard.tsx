import Link from "next/link";
import type { LoreEntry } from "@/types/content";
import styles from "./ArchiveCard.module.css";

interface ArchiveCardProps {
  entry: LoreEntry;
  className?: string;
  /** When provided, the (unlocked) card becomes a button that opens detail. */
  onSelect?: (entry: LoreEntry) => void;
}

export function ArchiveCard({ entry, className = "", onSelect }: ArchiveCardProps) {
  const locked = Boolean(entry.locked);

  const inner = (
    <>
      <header className={styles.head}>
        <span className={styles.archive}>ARCHIVE // {entry.archiveNumber}</span>
        <span className={styles.timestamp}>{entry.timestamp}</span>
      </header>
      <h3 className={styles.title}>{entry.title}</h3>
      <p className={`${styles.body} ${locked ? styles.bodyLocked : ""}`}>
        {locked
          ? "▓▓▓▓ ▓▓▓▓▓▓ ▓▓▓ ▓▓▓▓▓▓▓▓ ▓▓ ▓▓▓ ▓▓▓▓▓ — transmission sealed —"
          : entry.body}
      </p>
      <div className={styles.meta}>
        <span className={styles.category}>{entry.category}</span>
        {entry.integrity && (
          <span className={styles.integrity}>INTEGRITY {entry.integrity}</span>
        )}
      </div>
      {locked && (
        <div className={styles.lockOverlay}>
          <span className={styles.lockTag}>ENCRYPTED</span>
          <span className={styles.lockReq}>
            Requires {entry.requiredRank}
          </span>
          <Link href="/ranks" className={styles.decrypt}>
            Decrypt → verify rank
          </Link>
        </div>
      )}
    </>
  );

  const classes = [styles.card, locked ? styles.locked : "", className]
    .filter(Boolean)
    .join(" ");

  if (onSelect && !locked) {
    return (
      <button
        id={`archive-${entry.id}`}
        className={`${classes} ${styles.clickable}`}
        onClick={() => onSelect(entry)}
        aria-label={`Open ${entry.title}`}
      >
        {inner}
      </button>
    );
  }

  return (
    <article id={`archive-${entry.id}`} className={classes}>
      {inner}
    </article>
  );
}
