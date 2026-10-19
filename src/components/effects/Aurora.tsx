import styles from "./Aurora.module.css";

/**
 * Fixed page atmosphere: slow purple and green light behind everything, so the night-violet
 * page never reads as flat black. Pure CSS (blurred gradients), no JS; frozen for reduced motion.
 */
export function Aurora() {
  return (
    <div className={`${styles.aurora} no-print`} aria-hidden="true">
      <i className={styles.a1} />
      <i className={styles.a2} />
      <i className={styles.a3} />
    </div>
  );
}
