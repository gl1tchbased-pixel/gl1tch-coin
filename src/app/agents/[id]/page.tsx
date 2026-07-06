import type { Metadata } from "next";
import Link from "next/link";
import { agentCheck } from "@/lib/agent-trust";
import { isAddress } from "@/lib/validate";
import styles from "../agents.module.css";

const SITE = "https://coin-three-mu.vercel.app";

function parse(id: string): { chain: string; address: string } {
  const dec = decodeURIComponent(id);
  const i = dec.indexOf("-");
  // chain prefix only if the left side is a short word (avoid splitting EVM 0x-… on the dash)
  if (i > 0 && i <= 10 && !dec.slice(0, i).startsWith("0x")) return { chain: dec.slice(0, i), address: dec.slice(i + 1) };
  return { chain: "solana", address: dec };
}

const short = (a: string) => (a.length > 12 ? `${a.slice(0, 4)}…${a.slice(-4)}` : a);
const LEVEL: Record<string, { label: string; cls: string; icon: string }> = {
  trusted: { label: "TRUSTED", cls: "repClean", icon: "✓" },
  neutral: { label: "NEUTRAL", cls: "repNeutral", icon: "○" },
  caution: { label: "CAUTION", cls: "repCaution", icon: "⚠" },
  unknown: { label: "UNKNOWN", cls: "repUnknown", icon: "?" },
};

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const { chain, address } = parse(id);
  let title = `Agent Trust — ${short(address)} — GL1TCH KYA`;
  let desc = `Know Your Agent: GL1TCH's trust assessment for on-chain agent ${short(address)} — identity, provenance & reputation. Free, non-custodial.`;
  if (isAddress(address)) {
    const a = await agentCheck(address, chain);
    if (a) {
      title = `${LEVEL[a.level]?.label || "UNKNOWN"} · ${a.score}/100 — Agent ${short(address)} — GL1TCH KYA`;
      desc = `GL1TCH KYA trust for agent ${short(address)}: ${LEVEL[a.level]?.label || "UNKNOWN"} (${a.score}/100). ${a.reasons[0] || ""}`.slice(0, 300);
    }
  }
  return { title, description: desc, alternates: { canonical: `/agents/${chain}-${address}` } };
}

export default async function AgentProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { chain, address } = parse(id);
  const valid = isAddress(address);
  const a = valid ? await agentCheck(address, chain) : null;
  const meta = a ? LEVEL[a.level] || LEVEL.unknown : LEVEL.unknown;
  const badge = `${SITE}/api/agent/badge?address=${address}&chain=${chain}`;

  const jsonLd = a
    ? {
        "@context": "https://schema.org",
        "@type": "Rating",
        name: `GL1TCH KYA Agent Trust — ${short(address)}`,
        ratingValue: a.score,
        bestRating: 100,
        worstRating: 0,
        description: a.reasons[0] || "",
      }
    : null;

  return (
    <main className="container" style={{ paddingBlock: "var(--space-16)", maxWidth: 760 }}>
      {jsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />}

      <div style={{ marginBottom: "var(--space-6)" }}>
        <span className="t-eyebrow">Agent Trust · Know Your Agent</span>
        <h1 className="t-h1" style={{ marginTop: "var(--space-3)", fontSize: "clamp(1.6rem, 5vw, 2.4rem)", wordBreak: "break-all" }}>
          {short(address)}
        </h1>
        <p className="t-body" style={{ color: "var(--text-secondary)", fontFamily: "ui-monospace, monospace", fontSize: "0.85rem", wordBreak: "break-all" }}>
          {address} · {chain}
        </p>
      </div>

      {!valid ? (
        <p className={styles.cardD}>That doesn&apos;t look like a valid wallet address. <Link href="/agents">Check an agent →</Link></p>
      ) : (
        <div className={`${styles.result} ${styles[meta.cls]}`}>
          <div className={styles.resultHead}>
            <span className={styles.resultBadge}>{meta.icon} {meta.label}</span>
            <span className={styles.resultScore}>{a?.score ?? "—"}<small>/100</small></span>
          </div>
          <div className={styles.resultFlags}>
            <span className={a?.verified ? styles.flagOn : styles.flagOff}>{a?.verified ? "✓ identity verified" : "identity unverified"}</span>
            <span className={a?.registered ? styles.flagOn : styles.flagOff}>{a?.registered ? "✓ registered" : "not registered"}</span>
          </div>
          <ul className={styles.reasonList}>
            {(a?.reasons ?? ["Trust signal unavailable right now — try again shortly."]).map((r, i) => <li key={i}>{r}</li>)}
          </ul>
          <p className={styles.resultFoot}>KYA trust from GL1TCH — identity + on-chain provenance & reputation (Signal Graph). A reputation signal, not key custody. Not financial advice.</p>
        </div>
      )}

      <section className={styles.block}>
        <h2 className={styles.h2}>Embed this trust badge</h2>
        <div className={styles.code}>
          <pre>{`<a href="${SITE}/agents/${chain}-${address}">
  <img src="${badge}" alt="GL1TCH Agent Trust" width="360" height="84" />
</a>`}</pre>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={badge} alt="GL1TCH Agent Trust badge" width={360} height={84} style={{ marginTop: "0.75rem", maxWidth: "100%" }} />
      </section>

      <div className={styles.cta}>
        <Link href="/agents" className={styles.ctaGhost}>← Check another agent</Link>
        <Link href="/agents" className={styles.ctaGhost}>What is Know Your Agent? ↗</Link>
      </div>
    </main>
  );
}
