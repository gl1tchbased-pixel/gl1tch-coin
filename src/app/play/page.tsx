import type { Metadata } from "next";
import Link from "next/link";
import { RugOrNot } from "@/components/play/RugOrNot";
import { deckWeek, DECK_SIZE } from "@/content/play";
import styles from "./play.module.css";

export const metadata: Metadata = {
  title: "Rug or Not? — spot the rug in 8 tokens | GL1TCH",
  description:
    "A 2-minute game: eight made-up tokens, the same flags the GL1TCH scanner reads. Call SAFE or RUG, learn why, share your rank.",
  alternates: { canonical: "/play" },
};

// The deck rotates weekly; re-render hourly so a new week's cards go out on time.
export const revalidate = 3600;

export default function PlayPage() {
  return (
    <div className={styles.wrap}>
      <header className={styles.header}>
        <span className={styles.eyebrow}><i aria-hidden="true" />Rug or Not?</span>
        <h1 className={styles.title}>Spot the rug. <span className="hl">{DECK_SIZE} tokens.</span></h1>
        <p className={styles.sub}>
          Read the same flags the scanner reads, then call it: <b>SAFE</b> or <b>RUG</b>. Every token here is
          made up, and every answer comes with the reason. Keys: <kbd>S</kbd> safe, <kbd>R</kbd> rug, <kbd>Enter</kbd> next.
        </p>
      </header>

      <RugOrNot week={deckWeek()} />

      <section className={styles.rules} aria-labelledby="play-rules">
        <h2 id="play-rules" className={styles.h2}>What makes a rug here</h2>
        <ul>
          <li><b>Mint or freeze authority still on.</b> Unlimited supply, or a wallet that can be frozen.</li>
          <li><b>Less than half the liquidity locked.</b> The pool can be pulled.</li>
          <li><b>One wallet over 30% that isn&apos;t the pool.</b> The pool holding most of the supply is normal.</li>
          <li><b>Tax over 10%</b>, or a <b>deployer with 2+ rugs</b> in 30 days.</li>
        </ul>
        <p className={styles.note}>
          Real tokens are messier. The <Link href="/scan">scanner</Link> reads them live on Solana, Ethereum, Base, BNB and more,
          and tells you why.
        </p>
      </section>
    </div>
  );
}
