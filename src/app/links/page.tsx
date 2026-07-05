import type { Metadata } from "next";
import {
  OFFICIAL,
  CONTRACT_ADDRESS,
  GIVEBACK_WALLET,
  CURRENT_LAUNCH_STATUS,
  LAUNCH_STATUS,
  TRUST_REPORT,
  IMPERSONATION_WARNING,
  DISCLAIMER,
  links as officialLinks,
} from "@/lib/official";
import { TICKER } from "@/content/site";
import { CopyField } from "@/components/ui/CopyField";
import { XIcon, TelegramIcon, InstagramIcon, RedditIcon, GlobeIcon } from "@/components/icons/SocialIcons";
import { NoMintIcon, ShieldCheckIcon, LockIcon, CoinIcon } from "@/components/icons/Glyphs";
import styles from "./links.module.css";

export const metadata: Metadata = {
  title: "Official Links — GL1TCH",
  description:
    "The single source of truth for official GL1TCH links. Only trust links from this page.",
  alternates: { canonical: "/links" },
};

const channels = [
  { id: "link-x", label: "Official X", handle: "@gl1tchbased", href: OFFICIAL.X_URL, Icon: XIcon },
  { id: "link-tg", label: "Official Telegram", handle: "t.me/gl1tch_infected", href: OFFICIAL.TG_URL, Icon: TelegramIcon },
  { id: "link-ig", label: "Official Instagram", handle: "@gl1tch_infected", href: OFFICIAL.IG_URL, Icon: InstagramIcon },
  { id: "link-rd", label: "Official Reddit", handle: "u/gl1tch_infected", href: OFFICIAL.REDDIT_URL, Icon: RedditIcon },
  { id: "link-site", label: "Official Website", handle: "coin-three-mu.vercel.app", href: OFFICIAL.SITE_URL, Icon: GlobeIcon },
];

const trustRows = [
  { label: "Mint authority revoked", ok: TRUST_REPORT.mintRevoked, Icon: NoMintIcon },
  { label: "Freeze authority revoked", ok: TRUST_REPORT.freezeRevoked, Icon: ShieldCheckIcon },
  { label: "Zero tax (0% buy / 0% sell)", ok: TRUST_REPORT.zeroTax, Icon: CoinIcon },
  { label: "Liquidity burned / locked", ok: TRUST_REPORT.lpBurnedOrLocked, Icon: LockIcon },
];

const safety = [
  "Admins and team members NEVER DM you first.",
  "There is no 'support' outside the channels listed on this page.",
  "Always confirm the contract address matches the one on this page.",
  "We will never ask for your seed phrase or to 'verify' your wallet by connecting to a random site.",
  "If a deal sounds urgent or too good — it's a scam.",
];

export default function LinksPage() {
  const live = CURRENT_LAUNCH_STATUS === LAUNCH_STATUS.LIVE;

  return (
    <section className={styles.wrap}>
      <header className={styles.header}>
        <span className="t-eyebrow">Official Channels</span>
        <h1 className="t-h2" style={{ marginTop: "var(--space-3)" }}>
          Trust Only This Page.
        </h1>
        <span className={`${styles.statusPill} ${live ? styles.live : styles.pre}`}>
          <span className={styles.statusDot} />
          {live ? "LIVE" : "PRE-LAUNCH"}
        </span>
      </header>

      <div className={styles.warning} role="alert">
        ⚠ {IMPERSONATION_WARNING}
      </div>

      {/* Channels */}
      <div className={styles.channels}>
        {channels.map((c) => (
          <a
            key={c.id}
            id={c.id}
            href={c.href}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.channel}
          >
            <span className={styles.channelIcon}>
              <c.Icon size={20} />
            </span>
            <span className={styles.channelText}>
              <span className={styles.channelLabel}>{c.label}</span>
              <span className={styles.channelHandle}>{c.handle}</span>
            </span>
            <span className={styles.channelBadge}>Official ✓</span>
          </a>
        ))}
      </div>

      {/* Token info */}
      <div className={styles.card}>
        <div className={styles.cardHead}>
          <h2 className="t-h4">Token Info</h2>
          <span className={styles.chainBadge}>Solana · SPL</span>
        </div>
        <CopyField
          label={`${TICKER} contract address`}
          value={CONTRACT_ADDRESS}
          empty="Not live yet — no contract exists pre-launch. Anyone selling now is a scam."
        />
        {live && (
          <div className={styles.verifyLinks}>
            {officialLinks.explorer && (
              <a href={officialLinks.explorer} target="_blank" rel="noopener noreferrer">Solscan ↗</a>
            )}
            {officialLinks.dexscreener && (
              <a href={officialLinks.dexscreener} target="_blank" rel="noopener noreferrer">DEXScreener ↗</a>
            )}
            {officialLinks.geckoterminal && (
              <a href={officialLinks.geckoterminal} target="_blank" rel="noopener noreferrer">GeckoTerminal ↗</a>
            )}
            {officialLinks.rugcheck && (
              <a href={officialLinks.rugcheck} target="_blank" rel="noopener noreferrer">RugCheck ↗</a>
            )}
            {officialLinks.solsniffer && (
              <a href={officialLinks.solsniffer} target="_blank" rel="noopener noreferrer">SolSniffer ↗</a>
            )}
            {officialLinks.pumpfun && (
              <a href={officialLinks.pumpfun} target="_blank" rel="noopener noreferrer">Pump.fun ↗</a>
            )}
          </div>
        )}
      </div>

      {/* Trust panel */}
      <div className={styles.card}>
        <h2 className="t-h4" style={{ marginBottom: "var(--space-4)" }}>
          Trust Wall
        </h2>
        <div className={styles.trust}>
          {trustRows.map((r) => (
            <div key={r.label} className={styles.trustRow}>
              <span className={styles.trustIcon}>
                <r.Icon size={18} />
              </span>
              <span className={styles.trustLabel}>{r.label}</span>
              <span className={r.ok ? styles.ok : styles.pending}>
                {r.ok ? "✓ Verified" : "Verifies at launch"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Give-back */}
      {GIVEBACK_WALLET && (
        <div className={styles.card}>
          <h2 className="t-h4" style={{ marginBottom: "var(--space-4)" }}>
            Give-Back Wallet
          </h2>
          <p className={styles.cardNote}>
            Public, on-chain, verifiable. Every disbursement is a transaction you can audit.
          </p>
          <CopyField label="Solana wallet" value={GIVEBACK_WALLET} />
        </div>
      )}

      {/* Safety */}
      <div className={styles.card}>
        <h2 className="t-h4" style={{ marginBottom: "var(--space-4)" }}>
          How To Stay Safe
        </h2>
        <ul className={styles.safety}>
          {safety.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ul>
      </div>

      <p className={styles.disclaimer}>{DISCLAIMER}</p>
    </section>
  );
}
