import Image from "next/image";
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

        <Link href="/play" className={styles.invite}>
          <span className={styles.inviteArt}>
            <Image src="/brand/glitchy-v3/glitchy-shadow-wave.png" alt="" width={180} height={180} sizes="180px" />
          </span>
          <span className={styles.inviteText}>
            <span className={styles.inviteKicker}>Rug or Not? · a 2-minute game</span>
            <b>Think you can spot a rug?</b>
            <span>Eight made-up tokens, the same flags the scanner reads. Call SAFE or RUG and get your rank.</span>
          </span>
          <span className={styles.inviteGo}>Play →</span>
        </Link>
      </div>
    </section>
  );
}
