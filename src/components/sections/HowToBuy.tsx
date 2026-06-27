import Link from "next/link";
import { Reveal } from "@/components/effects/Reveal";
import { WalletIcon, CoinIcon, BoltIcon } from "@/components/icons/Glyphs";
import { CONTRACT_ADDRESS } from "@/lib/official";
import shared from "./shared.module.css";
import styles from "./HowToBuy.module.css";

const JUP_SWAP = CONTRACT_ADDRESS
  ? `https://jup.ag/swap/SOL-${CONTRACT_ADDRESS}`
  : "https://jup.ag";

const steps = [
  {
    id: "buy-1",
    n: "01",
    Icon: WalletIcon,
    title: "Get a Solana Wallet",
    body: "Install Phantom, Solflare, or Backpack. Self-custody — you hold your own keys.",
  },
  {
    id: "buy-2",
    n: "02",
    Icon: CoinIcon,
    title: "Fund With SOL",
    body: "Buy SOL on any major exchange and send it to your wallet, or buy in-wallet with a card.",
  },
  {
    id: "buy-3",
    n: "03",
    Icon: BoltIcon,
    title: "Swap For $GL1TCH",
    body: "Use only the official link from our Links page. Confirm the contract address matches before you buy.",
  },
];

export function HowToBuy() {
  return (
    <section className={`${shared.section} ${shared.alt}`} id="how-to-buy">
      <div className="container">
        <Reveal className={shared.head}>
          <span className={shared.eyebrow}>How To Buy</span>
          <h2 className={shared.title}>Three Steps. No Friction.</h2>
        </Reveal>

        <Reveal className={styles.grid}>
          {steps.map((s) => (
            <div key={s.id} id={s.id} className={styles.step}>
              <span className={styles.num}>{s.n}</span>
              <span className={styles.icon}>
                <s.Icon size={28} />
              </span>
              <h3 className={styles.title}>{s.title}</h3>
              <p className={styles.body}>{s.body}</p>
            </div>
          ))}
        </Reveal>

        <Reveal className={styles.footer}>
          <a
            href={JUP_SWAP}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.cta}
            id="how-to-buy-jup"
          >
            Buy Now on Jupiter →
          </a>
          <Link href="/links" className={styles.cta} id="how-to-buy-cta">
            Verify The Official Link →
          </Link>
          <span className={styles.warn}>
            ⚠ Only buy via the official Links page. Anyone DMing you a link is a scam.
          </span>
        </Reveal>
      </div>
    </section>
  );
}
