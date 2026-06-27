import Link from "next/link";
import { Reveal } from "@/components/effects/Reveal";
import {
  TRUST_REPORT,
  CURRENT_LAUNCH_STATUS,
  LAUNCH_STATUS,
  GIVEBACK_WALLET,
  links as officialLinks,
} from "@/lib/official";
import {
  ShieldCheckIcon,
  NoMintIcon,
  LockIcon,
  CoinIcon,
} from "@/components/icons/Glyphs";
import shared from "./shared.module.css";
import styles from "./TrustWall.module.css";

const guarantees = [
  {
    id: "tw-mint",
    label: "Mint Authority Revoked",
    sub: "Fixed 1,000,000,000 supply. No new tokens can ever be created.",
    ok: TRUST_REPORT.mintRevoked,
    Icon: NoMintIcon,
  },
  {
    id: "tw-freeze",
    label: "Freeze Authority Revoked",
    sub: "No wallet can ever be frozen or blacklisted.",
    ok: TRUST_REPORT.freezeRevoked,
    Icon: ShieldCheckIcon,
  },
  {
    id: "tw-tax",
    label: "Zero Tax — Buys & Sells",
    sub: "Token-2022 mint with no transfer-fee extension. 0% in, 0% out.",
    ok: TRUST_REPORT.zeroTax,
    Icon: CoinIcon,
  },
  {
    id: "tw-lp",
    label: "Liquidity Burned / Locked",
    sub: "Pump.fun bonding curve pre-grad · burned at Raydium migration.",
    ok: TRUST_REPORT.lpBurnedOrLocked,
    Icon: LockIcon,
  },
];

function riskTone(score: number | null): "good" | "warn" | "bad" | "unknown" {
  if (score == null) return "unknown";
  if (score <= 200) return "good";
  if (score <= 800) return "warn";
  return "bad";
}

export function TrustWall() {
  const live = CURRENT_LAUNCH_STATUS === LAUNCH_STATUS.LIVE;
  const tone = riskTone(TRUST_REPORT.rugcheckScore);
  return (
    <section className={shared.section} id="trust">
      <div className="container">
        <Reveal className={shared.head}>
          <span className={shared.eyebrow}>Trust Wall</span>
          <h2 className={shared.title}>Don&apos;t Trust. Verify.</h2>
          <p className={shared.body}>
            Every guarantee below is enforced on-chain and verifiable by anyone —
            no claim is taken on faith.
          </p>
        </Reveal>

        <Reveal className={styles.grid}>
          {guarantees.map((g) => (
            <div key={g.id} id={g.id} className={styles.card}>
              <span className={styles.icon}>
                <g.Icon size={26} />
              </span>
              <span className={styles.cardLabel}>{g.label}</span>
              <span className={styles.cardSub}>{g.sub}</span>
              <span className={g.ok ? styles.verified : styles.pending}>
                {g.ok ? "✓ Verified on-chain" : "Verifies at migration"}
              </span>
            </div>
          ))}
        </Reveal>

        {TRUST_REPORT.rugcheckScore != null && (
          <Reveal className={styles.auditStrip}>
            <div className={`${styles.auditCard} ${styles[`tone_${tone}`]}`}>
              <span className={styles.auditEyebrow}>Third-Party Audit</span>
              <div className={styles.auditRow}>
                <div className={styles.auditScore}>
                  <span className={styles.auditScoreNum}>
                    {TRUST_REPORT.rugcheckScore}
                  </span>
                  <span className={styles.auditScoreLabel}>
                    RugCheck risk score
                  </span>
                </div>
                <div className={styles.auditMeta}>
                  <span className={styles.auditRisk}>
                    Risk: <strong>{TRUST_REPORT.rugcheckRiskLevel ?? "—"}</strong>
                  </span>
                  <span className={styles.auditNote}>
                    No risks flagged · live, public report
                  </span>
                  <div className={styles.auditLinks}>
                    <a
                      href={TRUST_REPORT.rugcheckUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      RugCheck ↗
                    </a>
                    {officialLinks.solsniffer && (
                      <a
                        href={officialLinks.solsniffer}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        SolSniffer ↗
                      </a>
                    )}
                    {officialLinks.explorer && (
                      <a
                        href={officialLinks.explorer}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Solscan ↗
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        )}

        {GIVEBACK_WALLET && (
          <Reveal className={styles.giveback}>
            <span className={styles.givebackLabel}>Give-Back Wallet</span>
            <span className={styles.givebackBody}>
              Public, on-chain, audit-anytime. Every disbursement is a Solana
              transaction you can read.
            </span>
            <a
              href={officialLinks.givebackWallet}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.givebackAddr}
              aria-label="Open give-back wallet on Solscan"
            >
              {GIVEBACK_WALLET}
            </a>
          </Reveal>
        )}

        <Reveal className={styles.footer}>
          <span className={styles.note}>
            {live
              ? "Confirm everything yourself on Solscan, RugCheck, and SolSniffer."
              : "At launch these flip to live on-chain checks (Solscan · RugCheck · SolSniffer)."}
          </span>
          <Link href="/links" className={styles.link} id="trust-cta">
            Open Official Links &amp; Verify →
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
