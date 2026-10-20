import styles from "./template.module.css";

/**
 * Remounts on every route change, so each page slides in. CSS only and never transparent: the
 * old framer-motion fade started at opacity 0, which kept every page invisible (and its LCP
 * waiting) until all the JavaScript had loaded and hydrated.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className={styles.page}>{children}</div>;
}
