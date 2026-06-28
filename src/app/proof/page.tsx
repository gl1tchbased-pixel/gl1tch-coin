import type { Metadata } from "next";
import { ProofScan } from "@/components/web3/ProofScan";
import {
  OFFICIAL,
  CONTRACT_ADDRESS,
  GIVEBACK_WALLET,
  DEPLOYER_WALLET,
  links as officialLinks,
  solscanAccount,
} from "@/lib/official";
import styles from "./proof.module.css";

export const metadata: Metadata = {
  title: "Proof — Don't Trust Us, Verify Us | GL1TCH",
  description:
    "GL1TCH hands you the receipts: mint revoked, freeze revoked, zero tax, liquidity locked, code open. We built the rug-scanner — and we pass it live. Verify every claim yourself on Solscan, RugCheck & GeckoTerminal.",
  alternates: { canonical: "/proof" },
};

const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-6)}`;

// Each guarantee links to an INDEPENDENT source so nothing rests on our word.
const guarantees = [
  { label: "Mint authority revoked", sub: "Supply is fixed at 1,000,000,000. No one can ever print more.", href: officialLinks.explorer, src: "Solscan" },
  { label: "Freeze authority revoked", sub: "No wallet can be frozen or blacklisted. You can always sell.", href: officialLinks.explorer, src: "Solscan" },
  { label: "Zero tax — buys & sells", sub: "Token-2022 mint with no transfer-fee extension. 0% in, 0% out.", href: officialLinks.rugcheck, src: "RugCheck" },
  { label: "Liquidity locked / burned (100%)", sub: "The pool cannot be pulled out from under you — enforced by the chain, not by us.", href: officialLinks.rugcheck, src: "RugCheck" },
  { label: "Metadata immutable", sub: "Name and image are locked on-chain. No bait-and-switch later.", href: officialLinks.explorer, src: "Solscan" },
  { label: "0% insider / bundled supply", sub: "No coordinated wallet cluster waiting to dump on you.", href: officialLinks.rugcheck, src: "RugCheck" },
];

const wallets = [
  { label: "Token contract (mint)", addr: CONTRACT_ADDRESS, href: officialLinks.explorer, note: "Token-2022 · 1B fixed supply" },
  { label: "Deployer wallet", addr: DEPLOYER_WALLET, href: solscanAccount(DEPLOYER_WALLET), note: "Who created the token — inspect its history" },
  { label: "Give-back wallet", addr: GIVEBACK_WALLET, href: officialLinks.givebackWallet, note: "Public · every payout is a readable tx" },
];

const thirdParty = [
  { label: "RugCheck", href: officialLinks.rugcheck, note: "score 1 · cleanest band" },
  { label: "GeckoTerminal", href: `https://www.geckoterminal.com/solana/tokens/${CONTRACT_ADDRESS}`, note: "live price & pool" },
  { label: "SolSniffer", href: officialLinks.solsniffer, note: "independent safety scan" },
  { label: "Solscan", href: officialLinks.explorer, note: "raw on-chain truth" },
  { label: "DexScreener", href: officialLinks.dexscreener, note: "market & pair" },
  { label: "Pump.fun", href: officialLinks.pumpfun, note: "origin" },
];

export default function ProofPage() {
  return (
    <section className="container" style={{ paddingBlock: "var(--space-16)" }}>
      {/* Hero */}
      <div className={styles.hero}>
        <span className="t-eyebrow">Proof, not promises</span>
        <h1 className="t-h1" style={{ marginTop: "var(--space-3)" }}>
          Don&apos;t trust us. <span className={styles.accent}>Verify us.</span>
        </h1>
        <p className="t-body-lg" style={{ color: "var(--text-secondary)", maxWidth: 680, margin: "var(--space-4) auto 0" }}>
          We built the scanner that reads other tokens for rugs. So we run it on
          ourselves — live — and hand you the link to check every claim on
          independent sites. No faith required.
        </p>
      </div>

      {/* Live self-scan */}
      <div className={styles.block}>
        <ProofScan />
      </div>

      {/* Rugproof guarantees */}
      <div className={styles.block}>
        <h2 className={styles.h2}>The rug vectors — all neutralized</h2>
        <p className={styles.sub}>Each one is enforced on-chain. Click to confirm on a source we don&apos;t control.</p>
        <div className={styles.grid}>
          {guarantees.map((g) => (
            <a key={g.label} href={g.href} target="_blank" rel="noopener noreferrer" className={styles.gCard}>
              <span className={styles.gCheck}>✓</span>
              <span className={styles.gLabel}>{g.label}</span>
              <span className={styles.gSub}>{g.sub}</span>
              <span className={styles.gVerify}>Verify on {g.src} ↗</span>
            </a>
          ))}
        </div>
      </div>

      {/* Wallet map */}
      <div className={styles.block}>
        <h2 className={styles.h2}>Every wallet, in the open</h2>
        <p className={styles.sub}>No hidden team bags. Here is the full map — inspect any of them on Solscan.</p>
        <div className={styles.walletList}>
          {wallets.map((w) => (
            <a key={w.label} href={w.href} target="_blank" rel="noopener noreferrer" className={styles.wRow}>
              <div className={styles.wMeta}>
                <span className={styles.wLabel}>{w.label}</span>
                <span className={styles.wNote}>{w.note}</span>
              </div>
              <span className={styles.wAddr}>{short(w.addr)} ↗</span>
            </a>
          ))}
        </div>
      </div>

      {/* Open source */}
      <div className={styles.block}>
        <div className={styles.openSource}>
          <div>
            <h2 className={styles.h2} style={{ marginBottom: 8 }}>The code is open</h2>
            <p className={styles.sub} style={{ margin: 0 }}>
              Our scanner, bot and this site are public. Anonymous team — fully
              auditable work. Read it, fork it, check we&apos;re not hiding anything.
            </p>
          </div>
          <a href={OFFICIAL.GITHUB_URL} target="_blank" rel="noopener noreferrer" className={styles.osBtn}>
            View source on GitHub ↗
          </a>
        </div>
      </div>

      {/* Honest yellow flags */}
      <div className={styles.block}>
        <h2 className={styles.h2}>What we&apos;re not hiding</h2>
        <p className={styles.sub}>A fake-perfect score is a red flag. Here are our two honest caveats.</p>
        <div className={styles.flagGrid}>
          <div className={styles.flag}>
            <span className={styles.flagTag}>⚠ Thin liquidity</span>
            <p className={styles.flagBody}>
              The pool is small (we&apos;re early and unfunded). But it&apos;s{" "}
              <strong>100% locked/burned</strong> — a small pool we physically{" "}
              <em>cannot</em> pull is safer than a big one a dev can yank. We grow it
              organically, never by removing it.
            </p>
          </div>
          <div className={styles.flag}>
            <span className={styles.flagTag}>⚠ &quot;95.9% top holder&quot;</span>
            <p className={styles.flagBody}>
              That top account is the <strong>locked liquidity pool</strong>, not a
              person waiting to dump. The founder holds ~3.57%. Don&apos;t take our
              word — open the holder list on Solscan and see.
            </p>
          </div>
        </div>
      </div>

      {/* Third-party row */}
      <div className={styles.block}>
        <h2 className={styles.h2}>Checked by sources we don&apos;t control</h2>
        <div className={styles.tpGrid}>
          {thirdParty.map((t) => (
            <a key={t.label} href={t.href} target="_blank" rel="noopener noreferrer" className={styles.tpCard}>
              <span className={styles.tpLabel}>{t.label} ↗</span>
              <span className={styles.tpNote}>{t.note}</span>
            </a>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className={styles.cta}>
        <p className={styles.ctaLine}>
          GL1TCH doesn&apos;t ask for your trust — it hands you the receipts.
        </p>
        <div className={styles.ctaBtns}>
          <a href="/scan" className={styles.ctaPrimary}>Scan any token →</a>
          <a href={OFFICIAL.TG_URL} target="_blank" rel="noopener noreferrer" className={styles.ctaGhost}>Join Telegram</a>
        </div>
      </div>
    </section>
  );
}
