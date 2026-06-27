import styles from "./Scanlines.module.css";

/** Full-viewport scanline overlay. Desktop only, very subtle, drifts slowly. */
export function Scanlines() {
  return <div className={`${styles.scanlines} no-print`} aria-hidden="true" />;
}
