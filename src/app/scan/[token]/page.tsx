import type { Metadata } from "next";
import Link from "next/link";
import { ScanTool } from "@/components/web3/ScanTool";
import { CONTRACT_ADDRESS } from "@/lib/official";
import { CANONICAL } from "@/lib/scan";
import styles from "../scan.module.css";

// Prerender scan pages for well-known tokens so Google can index them — people search
// "is BONK safe", "WIF scam", "PEPE honeypot check". Free, compounding organic traffic.
export function generateStaticParams() {
  return CANONICAL.map((t) => ({ token: `${t.chain}-${t.address}` }));
}
export const dynamicParams = true; // still allow scanning any other token on demand

/** /scan/<chain>-<address> — a shareable scan permalink that unfurls into a branded
 *  verdict card (opengraph-image.tsx in this segment) on X / Telegram / Discord. */

const SITE = "https://coin-three-mu.vercel.app";

function parse(token: string): { chain: string; address: string } {
  const dec = decodeURIComponent(token);
  const i = dec.indexOf("-");
  if (i > 0) return { chain: dec.slice(0, i), address: dec.slice(i + 1) };
  return { chain: "", address: dec };
}

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params;
  const { chain, address } = parse(token);
  let title = "Token safety scan | GL1TCH Scanner";
  let desc = "Honest, plain-English token safety — honeypot, LP lock, mint/freeze, tax, holders & insiders. Non-custodial, any chain.";
  try {
    const r = await fetch(`${SITE}/api/scan?mint=${encodeURIComponent(address)}${chain ? `&chain=${chain}` : ""}`, { next: { revalidate: 300 } });
    if (r.ok) {
      const d = await r.json();
      if (d?.verdict) {
        const sym = d.symbol ? `$${d.symbol}` : (d.name || "token");
        title = `${sym} — ${d.verdict} ${d.score}/100 · GL1TCH Scanner`;
        desc = d.bottomLine || desc;
      }
    }
  } catch { /* fall back to generic */ }
  const url = `${SITE}/scan/${token}`;
  return {
    title,
    description: desc,
    alternates: { canonical: `/scan/${token}` },
    openGraph: { title, description: desc, url, type: "website" },
    twitter: { card: "summary_large_image", title, description: desc },
  };
}

const POINTS = [
  { k: "01", t: "Non-custodial", d: "It never asks for your keys and never holds your funds. It only reads the chain." },
  { k: "02", t: "Explained, not 'the AI decided'", d: "Every flag comes with a plain-language why — so you keep the judgment." },
  { k: "03", t: "Real on-chain data", d: "Mint state, liquidity, holders, insiders & RugCheck — aggregated live, not vibes." },
];

export default async function ScanTokenPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { chain, address } = parse(token);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "GL1TCH Scanner",
    applicationCategory: "SecurityApplication",
    operatingSystem: "Web",
    url: `${SITE}/scan/${token}`,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    description:
      "Free, non-custodial crypto token safety scanner. Checks honeypot, LP lock, mint/freeze authority, tax, holder concentration & insiders on any chain — plain-English rug verdict.",
  };
  // Interlink to a few popular scans for crawlability + discovery.
  const popular = CANONICAL.filter((t) => t.symbol && `${t.chain}-${t.address}` !== token).slice(0, 8);
  return (
    <main className={styles.wrap}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <header className={styles.header}>
        <span className="t-eyebrow">
          <span className={styles.pulse} aria-hidden="true" /> GL1TCH Scanner
        </span>
        <h1 className={styles.title}>Don&apos;t get rugged.</h1>
        <p className={styles.sub}>
          The rogue AI read this token on-chain — verdict, the degen intel, and its own take.
          Scan anything else by name or contract, <em>any chain</em>.
        </p>
      </header>

      <ScanTool initialAddress={address} initialChain={chain || undefined} />

      <section className={styles.points}>
        {POINTS.map((p) => (
          <div key={p.k} className={styles.point}>
            <span className={styles.pointK}>{p.k}</span>
            <h3>{p.t}</h3>
            <p>{p.d}</p>
          </div>
        ))}
      </section>

      <section style={{ marginTop: "var(--space-10)" }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: "var(--space-4)", color: "var(--text-primary)" }}>Popular safety scans</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)" }}>
          {popular.map((t) => (
            <Link
              key={`${t.chain}-${t.address}`}
              href={`/scan/${t.chain}-${t.address}`}
              style={{ padding: "8px 14px", borderRadius: "var(--radius-full)", border: "1px solid var(--color-border)", color: "var(--text-secondary)", fontSize: 14 }}
            >
              Is ${t.symbol} safe?
            </Link>
          ))}
        </div>
        <p style={{ marginTop: "var(--space-4)", fontSize: 14 }}>
          <Link href="/radar" style={{ color: "var(--color-signal)" }}>See the rugs we caught this week →</Link>
        </p>
      </section>

      <section className={styles.cta}>
        <p>
          The scanner is free for everyone. Holding <strong>$GL1TCH</strong> unlocks unlimited
          scans, wallet watchtower and real-time rug alerts — your rank, your access.
        </p>
        <div className={styles.ctaRow}>
          <Link href="/ranks" className={styles.ctaBtn}>See the rank ladder →</Link>
          {CONTRACT_ADDRESS && <Link href="/live" className={styles.ctaAlt}>Get $GL1TCH</Link>}
        </div>
      </section>
    </main>
  );
}
