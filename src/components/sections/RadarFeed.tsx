import Link from "next/link";
import { RugRadar } from "@/components/web3/RugRadar";
import shared from "./shared.module.css";
import styles from "./RadarFeed.module.css";

/** Homepage window onto the Rug Radar: the latest sweep's riskiest catches, each linking to a report. */
export function RadarFeed() {
  return (
    <section className={`${shared.section} ${shared.alt}`} id="radar" aria-labelledby="radar-title">
      <div className="container">
        <div className={styles.head}>
          <div className={shared.head}>
            <span className={shared.eyebrow}>Rug Radar · live</span>
            <h2 id="radar-title" className={shared.title}>
              Caught <span className="hl">this sweep.</span>
            </h2>
            <p className={shared.body}>
              Freshly promoted tokens, run through the scanner and ranked riskiest first. A risk signal on real
              targets, not financial advice.
            </p>
          </div>
          <Link href="/radar" className={styles.all}>Open the full radar →</Link>
        </div>
        <RugRadar />
      </div>
    </section>
  );
}
