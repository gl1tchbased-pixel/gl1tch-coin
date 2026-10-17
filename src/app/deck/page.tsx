import type { Metadata } from "next";
import Link from "next/link";
import { OFFICIAL } from "@/lib/official";
import styles from "./deck.module.css";

// Grant/partner deck. Linked from funding applications only: kept out of nav,
// sitemap and search. Every number here must stay verifiable (see /proof).
export const metadata: Metadata = {
  title: "Grant Deck — GL1TCH",
  description:
    "GL1TCH grant deck: a free, open-source token safety scanner for Solana. Problem, product, honest traction, roadmap and use of funds.",
  alternates: { canonical: "/deck" },
  robots: { index: false, follow: false },
};

const product = [
  {
    title: "Scanner",
    text: "Paste any token address or search by name. Returns a 0–100 score and a verdict (CLEAN → RUG-SHAPED) with a plain-language reason for every check.",
  },
  {
    title: "Rug Radar",
    text: "Sweeps freshly promoted tokens every hour and ranks them by risk, so the flagged ones are visible before people buy.",
  },
  {
    title: "Public API + badge",
    text: "Free JSON API and an embeddable “Scanned by GL1TCH” badge that auto-updates, so wallets, launchpads and communities can show a live risk check.",
  },
  {
    title: "Telegram bot + Watchtower",
    text: "Scan from chat, and get alerted when a watched token’s risk changes or a watched wallet dumps 25%+ of a position.",
  },
];

const checks = [
  "Mint and freeze authority (can supply be printed or wallets frozen?)",
  "Token-2022 extensions, including hidden transfer fees",
  "Liquidity depth and LP lock / burn status",
  "Top-holder concentration",
  "Bundled, sniper and insider wallets at launch",
  "Deployer track record across every token we have scanned",
  "RugCheck as an independent second source; GoPlus for EVM chains (honeypot, sell tax, mintable, ownership, pausable)",
];

const funding = [
  {
    track: "Core (Solana Foundation proposal)",
    items: [
      ["Keep the free API and Telegram bot hosted for 12 months, with a public status page", "$3,000"],
      ["Publish the Solana check engine as a standalone open-source npm package with docs and tests", "$4,000"],
      ["Claude-written plain-language explanations on every scan (explaining only data the scanner verified), plus API docs", "$3,000"],
    ],
  },
  {
    track: "Mobile (Solana Seeker proposal)",
    items: [
      ["Android MVP: scan by paste, QR or the Android share sheet (share a token link from any app → instant verdict); publish to the Solana dApp Store", "$4,000"],
      ["Mobile Wallet Adapter: connect a wallet read-only and risk-check every token you hold in one tap; push alerts from Watchtower", "$4,000"],
      ["Seeker polish, offline verdict cache, open-source the app, and mobile API/RPC capacity for 12 months", "$4,000"],
    ],
  },
] as const;

export default function DeckPage() {
  return (
    <section className={styles.wrap}>
      <article className={`${styles.slide} ${styles.cover}`}>
        <span className="t-eyebrow">Grant deck · October 2026</span>
        <h1 className="t-h2">GL1TCH: scan before you buy</h1>
        <p className={styles.lead}>
          A free, open-source token safety scanner for Solana (plus major EVM chains). Paste
          any token and get a risk score with plain-language reasons in seconds. Read-only:
          it never asks for a signature to scan.
        </p>
        <div className={styles.links}>
          <a className={styles.link} href={`${OFFICIAL.SITE_URL}/scan`}>Live scanner</a>
          <a className={styles.link} href={OFFICIAL.GITHUB_URL}>Source code</a>
          <a className={styles.link} href={`${OFFICIAL.SITE_URL}/proof`}>Proof page</a>
        </div>
      </article>

      <article className={styles.slide}>
        <span className={styles.num}>01 · Problem</span>
        <p className={styles.stat}>98.6%</p>
        <p className={styles.body}>
          of tokens launched on Pump.fun collapsed into pump-and-dump schemes shortly after
          launch, across 7M+ tokens analysed from January 2024 to March 2025.
        </p>
        <p className={styles.source}>Source: Solidus Labs, 2025 Rug Pull Report (May 2025).</p>
        <p className={styles.body}>
          Retail buyers see a ticker and a chart. The red flags (a live mint authority, a
          freeze authority, a hidden Token-2022 transfer fee, unlocked liquidity, bundled
          sniper wallets, a deployer with a history of rugs) sit in on-chain state they
          can&apos;t read. Many checkers show raw flags with little explanation, and some keep
          the deeper data behind a paywall.
        </p>
      </article>

      <article className={styles.slide}>
        <span className={styles.num}>02 · Product (live today)</span>
        <div className={styles.grid}>
          {product.map((p) => (
            <div key={p.title} className={styles.card}>
              <span className={styles.cardTitle}>{p.title}</span>
              <span className={styles.cardText}>{p.text}</span>
            </div>
          ))}
        </div>
      </article>

      <article className={styles.slide}>
        <span className={styles.num}>03 · What every Solana scan checks</span>
        <ul className={styles.list}>
          {checks.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      </article>

      <article className={styles.slide}>
        <span className={styles.num}>04 · Why it&apos;s different</span>
        <ul className={styles.list}>
          <li><strong>Free, no paywall.</strong> The full scan, API and badge cost nothing.</li>
          <li><strong>Explains, not just flags.</strong> Several sources become one verdict with a reason per check.</li>
          <li><strong>Remembers deployers.</strong> Every scan feeds a deployer history, so a serial rugger&apos;s next token is flagged.</li>
          <li><strong>Built to be reused.</strong> Public API and badge let any wallet, launchpad or community embed a risk check.</li>
          <li><strong>Non-custodial and open source.</strong> Read-only by design; the code is public.</li>
        </ul>
      </article>

      <article className={styles.slide}>
        <span className={styles.num}>05 · Traction (honest numbers)</span>
        <ul className={styles.list}>
          <li>Scanner live since late June 2026, built and run by one person at no cost to users.</li>
          <li>About <strong>1,950 scans by mid-July 2026</strong> with no paid marketing.</li>
          <li>
            The bot&apos;s hosting lapsed in late July, which took the scan counter offline. It was
            restored on 17 October 2026, so we have no reliable figure for August–October.
          </li>
          <li>Solana natively, plus 15 EVM chains through GoPlus (Ethereum, Base, BNB Chain, Arbitrum, Polygon and more).</li>
        </ul>
      </article>

      <article className={styles.slide}>
        <span className={styles.num}>06 · Roadmap and use of funds</span>
        <p className={styles.body}>
          Each milestone is funded once. If one program funds a milestone, it is removed from
          every other request.
        </p>
        {funding.map((f) => (
          <table key={f.track} className={styles.table}>
            <thead>
              <tr>
                <th>{f.track}</th>
                <th>Budget</th>
              </tr>
            </thead>
            <tbody>
              {f.items.map(([what, amount]) => (
                <tr key={what}>
                  <td>{what}</td>
                  <td className={styles.amount}>{amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ))}
        <p className={styles.body}>
          Why mobile: most Solana trading starts from a link on a phone. On Seeker, the scan
          sits one share-tap away from the moment someone is about to buy, and the app never
          requests a transaction signature.
        </p>
      </article>

      <article className={styles.slide}>
        <span className={styles.num}>07 · Token disclosure</span>
        <p className={styles.body}>
          The project also launched a community token, $GL1TCH, on Pump.fun on 29 May 2026
          (Token-2022, mint and freeze authority revoked, 0% tax). The deployer wallet sold its
          full position on 20 August 2026; the on-chain receipt is on the{" "}
          <Link className={styles.link} href="/proof">proof page</Link>. The token has no active
          market. <strong>No grant funds go to the token, buybacks or liquidity.</strong>
        </p>
      </article>

      <article className={styles.slide}>
        <span className={styles.num}>08 · Team and contact</span>
        <p className={styles.body}>
          Solo founder based in Turkey, who designed, built and operates the whole stack:
          scanner, public API, badge, Rug Radar and the Telegram bot.
        </p>
        <div className={styles.links}>
          <a className={styles.link} href="mailto:founder@gl1tchbased.xyz">founder@gl1tchbased.xyz</a>
          <a className={styles.link} href={OFFICIAL.SITE_URL}>gl1tchbased.xyz</a>
          <a className={styles.link} href={OFFICIAL.X_URL}>X</a>
          <a className={styles.link} href={OFFICIAL.TG_URL}>Telegram</a>
          <a className={styles.link} href={OFFICIAL.GITHUB_URL}>GitHub</a>
        </div>
      </article>
    </section>
  );
}
