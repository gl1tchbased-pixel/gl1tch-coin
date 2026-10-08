import type { Metadata } from "next";
import Link from "next/link";
import { LiveStats } from "@/components/web3/LiveStats";
import { MarketChartEmbed } from "@/components/web3/MarketChartEmbed";
import { CopyField } from "@/components/ui/CopyField";
import {
  CONTRACT_ADDRESS,
  TRUST_REPORT,
  links as officialLinks,
} from "@/lib/official";
import { TICKER } from "@/content/site";
import { GECKO_POOL_URL } from "@/lib/market";
import styles from "./live.module.css";

export const metadata: Metadata = {
  title: "Live Market — GL1TCH",
  description:
    "Live $GL1TCH price, market cap, liquidity and volume with a real-time chart. Buy on Jupiter and verify on-chain.",
  alternates: { canonical: "/live" },
};

const JUP_SWAP = CONTRACT_ADDRESS
  ? `https://jup.ag/swap/SOL-${CONTRACT_ADDRESS}`
  : "https://jup.ag";
const BIRDEYE = CONTRACT_ADDRESS
  ? `https://birdeye.so/token/${CONTRACT_ADDRESS}?chain=solana`
  : "https://birdeye.so";

// No DexScreener: it dropped the pair, so its token page shows no market.
const verifyLinks = [
  { label: "Solscan", href: officialLinks.explorer },
  { label: "RugCheck", href: officialLinks.rugcheck },
  { label: "GeckoTerminal", href: GECKO_POOL_URL },
  { label: "Birdeye", href: BIRDEYE },
].filter((l) => l.href);

// Only guarantees TRUST_REPORT marks as verified get a checkmark.
const trustItems = [
  { ok: TRUST_REPORT.zeroTax, text: "Zero tax — 0% buy / 0% sell" },
  {
    ok: TRUST_REPORT.mintRevoked && TRUST_REPORT.freezeRevoked,
    text: "Mint & freeze authority revoked",
  },
  { ok: TRUST_REPORT.mintRevoked, text: "Fixed 1,000,000,000 supply" },
  {
    ok: TRUST_REPORT.metadataImmutable,
    text: "Metadata immutable — name, ticker & logo can't change",
  },
  {
    ok: TRUST_REPORT.rugcheckScore != null,
    text: `RugCheck risk score ${TRUST_REPORT.rugcheckScore} · ${
      TRUST_REPORT.rugcheckRiskLevel ?? "—"
    } risk (lower is safer)`,
  },
].filter((t) => t.ok);

export default function LivePage() {
  return (
    <section className={styles.wrap}>
      <header className={styles.header}>
        <div>
          <span className="t-eyebrow">Live Market</span>
          <h1 className="t-h2" style={{ marginTop: "var(--space-3)" }}>
            $GL1TCH — Live On Solana
          </h1>
        </div>
        <div className={styles.actions}>
          <a className={styles.buy} href={JUP_SWAP} target="_blank" rel="noopener noreferrer">
            Buy on Jupiter
          </a>
          {officialLinks.pumpfun && (
            <a className={styles.buyAlt} href={officialLinks.pumpfun} target="_blank" rel="noopener noreferrer">
              Pump.fun
            </a>
          )}
        </div>
      </header>

      <LiveStats />

      <MarketChartEmbed />

      <div className={styles.grid}>
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Contract</h2>
          <CopyField label={`${TICKER} contract address`} value={CONTRACT_ADDRESS} />
          <div className={styles.verify}>
            {verifyLinks.map((l) => (
              <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer">
                {l.label} ↗
              </a>
            ))}
          </div>
        </div>

        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Verified On-Chain</h2>
          <ul className={styles.trust}>
            {trustItems.map((t) => (
              <li key={t.text}>
                <span className={styles.ok}>✓</span> {t.text}
              </li>
            ))}
          </ul>
          <Link href="/#trust" className={styles.trustLink}>
            See the full Trust Wall →
          </Link>
        </div>
      </div>

      <p className={styles.disclaimer}>
        Market data comes from public aggregators (GeckoTerminal, or DexScreener
        when it lists the pair) and refreshes about every 30 seconds, so it can
        trail the chain by a minute or two. Nothing here is financial advice.
        Always confirm the contract address before buying.
      </p>

      <div className={styles.footer}>
        <Link href="/" className={styles.back}>← Back to home</Link>
        <Link href="/links" className={styles.back}>Official links →</Link>
      </div>
    </section>
  );
}
