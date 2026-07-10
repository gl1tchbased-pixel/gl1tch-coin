import type { Metadata } from "next";
import { PrintButton } from "@/components/ui/PrintButton";
import { WhitepaperNav } from "@/components/web3/WhitepaperNav";
import { BackToTop } from "@/components/web3/BackToTop";
import {
  whitepaperSections,
  WHITEPAPER_META,
  type WPBlock,
} from "@/content/whitepaper";
import { TICKER } from "@/content/site";
import styles from "./whitepaper.module.css";

export const metadata: Metadata = {
  title: "Whitepaper — GL1TCH",
  description:
    "The GL1TCH whitepaper (v3): the risk-intelligence product suite (Scanner, Signal Graph, Quantum Core, verifiable Randomness), a required-utility token, honest engineered value-accrual, Token-2022 zero-tax tokenomics, security, and risk.",
  alternates: { canonical: "/whitepaper" },
};

const KEY_FACTS = [
  { k: "Chain", v: "Solana" },
  { k: "Supply", v: "1,000,000,000 fixed" },
  { k: "Tax", v: "0%" },
  { k: "Authorities", v: "Revoked" },
];

function readingMinutes(): number {
  let words = 0;
  for (const s of whitepaperSections) {
    words += s.title.split(/\s+/).length;
    for (const b of s.blocks) {
      if (b.text) words += b.text.split(/\s+/).length;
      b.items?.forEach((i) => (words += i.split(/\s+/).length));
      b.rows?.forEach((r) => r.forEach((c) => (words += c.split(/\s+/).length)));
    }
  }
  return Math.max(1, Math.round(words / 200));
}

function Block({ block, dropcap }: { block: WPBlock; dropcap?: boolean }) {
  if (block.type === "p")
    return (
      <p className={`${styles.p} ${dropcap ? styles.dropcap : ""}`}>{block.text}</p>
    );
  if (block.type === "list")
    return (
      <ul className={styles.list}>
        {block.items?.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    );
  if (block.type === "table")
    return (
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          {block.headers && (
            <thead>
              <tr>
                {block.headers.map((h, i) => (
                  <th key={i}>{h}</th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {block.rows?.map((row, i) => (
              <tr key={i}>
                {row.map((cell, j) => (
                  <td key={j}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  return null;
}

export default function WhitepaperPage() {
  const navItems = whitepaperSections.map((s) => ({ id: s.id, title: s.title }));
  const mins = readingMinutes();

  return (
    <div className={`container ${styles.wrap}`}>
      <header className={styles.masthead}>
        <div className={styles.cover} aria-hidden="true">
          <span className={styles.coverRing} />
          <span className={styles.coverRing} />
          <span className={styles.coverDot} />
        </div>
        <span className="t-eyebrow">Whitepaper {WHITEPAPER_META.version}</span>
        <h1 className={styles.title}>{WHITEPAPER_META.title}</h1>
        <p className={styles.subtitle}>{WHITEPAPER_META.subtitle}</p>

        <div className={styles.metaRow}>
          <span>{TICKER}</span>
          <span className={styles.sep}>·</span>
          <span>Solana</span>
          <span className={styles.sep}>·</span>
          <span>Updated {WHITEPAPER_META.updated}</span>
          <span className={styles.sep}>·</span>
          <span>{mins} min read</span>
        </div>

        <ul className={styles.facts}>
          {KEY_FACTS.map((f) => (
            <li key={f.k} className={styles.fact}>
              <span className={styles.factK}>{f.k}</span>
              <span className={styles.factV}>{f.v}</span>
            </li>
          ))}
        </ul>

        <div className={`${styles.actions} no-print`}>
          <PrintButton />
          <a className={styles.download} href="/whitepaper.md" download>
            Download (.md) ↓
          </a>
        </div>
      </header>

      <div className={styles.layout}>
        <WhitepaperNav items={navItems} />

        <article className={styles.doc}>
          {whitepaperSections.map((section, si) => (
            <section key={section.id} id={section.id} className={styles.section}>
              <h2 className={styles.h2}>
                <span>{section.title}</span>
                <a
                  href={`#${section.id}`}
                  className={`${styles.anchor} no-print`}
                  aria-label={`Link to ${section.title}`}
                >
                  #
                </a>
              </h2>
              {section.blocks.map((block, i) => (
                <Block key={i} block={block} dropcap={si === 0 && i === 0} />
              ))}
            </section>
          ))}
          <p className={styles.footerNote}>
            {TICKER} · {WHITEPAPER_META.title} {WHITEPAPER_META.version} ·{" "}
            {WHITEPAPER_META.updated}. Not financial advice.
          </p>
        </article>
      </div>

      <BackToTop />
    </div>
  );
}
