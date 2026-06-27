import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  OFFICIAL,
  CONTRACT_ADDRESS,
  GIVEBACK_WALLET,
  links as officialLinks,
} from "@/lib/official";
import { PROJECT_NAME, TICKER, BLOCKCHAIN } from "@/content/site";
import { CopyField } from "@/components/ui/CopyField";
import styles from "./press.module.css";

export const metadata: Metadata = {
  title: "Press Kit — GL1TCH",
  description:
    "Official GL1TCH press kit — logos, brand assets, color palette, boilerplate copy, contract address and verified facts for media and exchange listings.",
  alternates: { canonical: "/press" },
};

const facts: { label: string; value: string }[] = [
  { label: "Project", value: `${PROJECT_NAME} (${TICKER})` },
  { label: "Chain", value: `${BLOCKCHAIN} · Token-2022` },
  { label: "Supply", value: "1,000,000,000 (fixed)" },
  { label: "Tax", value: "0% buy / 0% sell" },
  { label: "Authorities", value: "Mint & freeze revoked" },
  { label: "Launch", value: "Pump.fun · May 2026" },
];

const assets = [
  { src: "/brand/gl1tch-logo-256.png", name: "Logo 256²", file: "gl1tch-logo-256.png", w: 256, h: 256, square: true },
  { src: "/brand/gl1tch-avatar-1.png", name: "Avatar A", file: "gl1tch-avatar-1.png", w: 512, h: 512, square: true },
  { src: "/brand/gl1tch-avatar-2.png", name: "Avatar B", file: "gl1tch-avatar-2.png", w: 512, h: 512, square: true },
  { src: "/brand/gl1tch-banner.png", name: "Banner 1500×500", file: "gl1tch-banner.png", w: 1500, h: 500, square: false },
];

const palette = [
  { name: "Void", hex: "#050505" },
  { name: "Signal", hex: "#7cff4f" },
  { name: "Glitch", hex: "#7a3cff" },
  { name: "Static", hex: "#f5f7f8" },
  { name: "Graphite", hex: "#16181d" },
];

const boilerplate = `${PROJECT_NAME} (${TICKER}) is a Solana-native, internet-born meme brand: a rogue-AI cult with one focused, live utility — token-gated access and on-chain ranks. Zero tax, fixed 1,000,000,000 supply, mint and freeze authorities revoked, and a public give-back wallet. Built to be verified, not trusted.`;

export default function PressPage() {
  return (
    <section className={styles.wrap}>
      <header className={styles.header}>
        <span className="t-eyebrow">Press Kit</span>
        <h1 className="t-h2" style={{ marginTop: "var(--space-3)" }}>
          Brand Assets &amp; Media Facts
        </h1>
        <p className={styles.sub}>
          Everything media, aggregators and exchanges need to feature {PROJECT_NAME}{" "}
          accurately. Free to use as-is — please don&apos;t alter the marks.
        </p>
      </header>

      {/* Facts */}
      <div className={styles.section}>
        <h2 className="t-h4">At A Glance</h2>
        <div className={styles.facts}>
          {facts.map((f) => (
            <div key={f.label} className={styles.fact}>
              <span className={styles.factLabel}>{f.label}</span>
              <span className={styles.factValue}>{f.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Contract */}
      <div className={styles.section}>
        <h2 className="t-h4">Contract</h2>
        <CopyField label={`${TICKER} contract address`} value={CONTRACT_ADDRESS} />
        <div className={styles.verifyLinks}>
          {officialLinks.explorer && (
            <a href={officialLinks.explorer} target="_blank" rel="noopener noreferrer">Solscan ↗</a>
          )}
          {officialLinks.dexscreener && (
            <a href={officialLinks.dexscreener} target="_blank" rel="noopener noreferrer">DexScreener ↗</a>
          )}
          {officialLinks.rugcheck && (
            <a href={officialLinks.rugcheck} target="_blank" rel="noopener noreferrer">RugCheck ↗</a>
          )}
        </div>
      </div>

      {/* Assets */}
      <div className={styles.section}>
        <h2 className="t-h4">Logos &amp; Imagery</h2>
        <div className={styles.assets}>
          {assets.map((a) => (
            <a
              key={a.file}
              href={a.src}
              download={a.file}
              className={`${styles.asset} ${a.square ? styles.square : styles.wide}`}
            >
              <span className={styles.assetPreview}>
                <Image
                  src={a.src}
                  alt={`${PROJECT_NAME} ${a.name}`}
                  width={a.w}
                  height={a.h}
                  className={styles.assetImg}
                />
              </span>
              <span className={styles.assetMeta}>
                <span className={styles.assetName}>{a.name}</span>
                <span className={styles.assetDownload}>Download ↓</span>
              </span>
            </a>
          ))}
        </div>
        <p className={styles.note}>
          Animated banner:{" "}
          <a href="/brand/gl1tch-banner.gif" download className={styles.inlineLink}>
            gl1tch-banner.gif ↓
          </a>
        </p>
      </div>

      {/* Palette */}
      <div className={styles.section}>
        <h2 className="t-h4">Color Palette</h2>
        <div className={styles.palette}>
          {palette.map((c) => (
            <div key={c.hex} className={styles.swatch}>
              <span className={styles.chip} style={{ background: c.hex }} />
              <span className={styles.swatchName}>{c.name}</span>
              <span className={styles.swatchHex}>{c.hex}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Boilerplate */}
      <div className={styles.section}>
        <h2 className="t-h4">Boilerplate</h2>
        <p className={styles.boiler}>{boilerplate}</p>
      </div>

      {/* Channels */}
      <div className={styles.section}>
        <h2 className="t-h4">Official Channels</h2>
        <div className={styles.channels}>
          <a href={OFFICIAL.X_URL} target="_blank" rel="noopener noreferrer">X / Twitter ↗</a>
          <a href={OFFICIAL.TG_URL} target="_blank" rel="noopener noreferrer">Telegram ↗</a>
          <a href={OFFICIAL.IG_URL} target="_blank" rel="noopener noreferrer">Instagram ↗</a>
          <a href={OFFICIAL.SITE_URL} target="_blank" rel="noopener noreferrer">Website ↗</a>
        </div>
        {GIVEBACK_WALLET && (
          <p className={styles.note}>
            Give-back wallet:{" "}
            <a href={officialLinks.givebackWallet} target="_blank" rel="noopener noreferrer" className={styles.inlineLink}>
              {GIVEBACK_WALLET}
            </a>
          </p>
        )}
      </div>

      <div className={styles.footer}>
        <Link href="/" className={styles.back}>← Back to home</Link>
        <Link href="/links" className={styles.back}>Official links →</Link>
      </div>
    </section>
  );
}
