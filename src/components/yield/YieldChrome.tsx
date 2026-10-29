import Link from "next/link";
import styles from "@/app/yield/yield.module.css";
import { DISCLAIMER } from "@/lib/yield/copy";

export function YieldSubnav() {
  return (
    <nav className={styles.subnav} aria-label="Yield X-Ray">
      <Link href="/yield">All yields</Link>
      <Link href="/yield/staking">SOL vs ETH staking</Link>
      <Link href="/yield/dollar">Where does a dollar earn?</Link>
      <Link href="/yield/il">Impermanent loss, visualised</Link>
    </nav>
  );
}

/** Shown instead of data when the bot's snapshot can't be read (bot down, first run still warming up). */
export function Unavailable() {
  return (
    <div className={`${styles.panel} ${styles.unavailable}`}>
      <p className={styles.p} style={{ margin: 0 }}>
        Yield data is temporarily unavailable. The collector reads the chains every hour; check back in a few minutes.
      </p>
    </div>
  );
}

export function Disclaimer() {
  return <p className={styles.disclaimer}>{DISCLAIMER}</p>;
}
