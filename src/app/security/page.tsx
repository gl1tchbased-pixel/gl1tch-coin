import type { Metadata } from "next";
import Link from "next/link";
import { OFFICIAL } from "@/lib/official";
import styles from "./security.module.css";

export const metadata: Metadata = {
  title: "Security & Transparency — GL1TCH",
  description:
    "How GL1TCH protects you: never asks for a fund/approval signature, hardened CSP, input validation, rate limiting, automated secret + dependency scanning, and a public threat model. Your protection is free, forever.",
  alternates: { canonical: "/security" },
};

const posture = [
  { t: "We never move your funds", d: "No component ever requests a transaction, token approval, or spend signature — only a message that proves wallet ownership. This is enforced by an automated CI check, not just a promise." },
  { t: "Hardened against XSS & clickjacking", d: "Strict Content-Security-Policy, HSTS, frame-ancestors DENY, COOP and a locked-down Permissions-Policy on every page." },
  { t: "Every input is validated", d: "A central validation layer rejects any malformed address or query before it touches an RPC, database, or outbound request (SSRF-safe)." },
  { t: "Abuse-resistant", d: "Public endpoints are rate-limited; edge/WAF hardening is layered on top as traffic grows." },
  { t: "Automated security in CI", d: "Every push is scanned for leaked secrets (gitleaks) and vulnerable dependencies — a known-critical advisory blocks the build. We patch, or track it transparently." },
  { t: "Open & auditable", d: "The scanner, bot and this site are open source. A living threat model and risk register are maintained in the repo. Anonymous team, fully verifiable code." },
];

const principles = [
  { t: "Your protection is free — forever", d: "Scanning, plain-English explanations and the safety verdict are free for everyone and are NEVER gated behind holding $GL1TCH. Holding only unlocks convenience (speed, depth, automation) — never the protection itself." },
  { t: "Plain language, not a black box", d: "Every risk finding comes with a clear 'why this matters', and every claim links to on-chain proof you can verify yourself." },
  { t: "Probabilistic, never accusatory", d: "We say 'this pattern matches projects that later rugged', never 'this is a scam' — and any project can appeal a flag through a verified process." },
  { t: "Not financial advice", d: "Every score is a risk signal, not investment advice. Crypto is high-risk; always DYOR." },
];

export default function SecurityPage() {
  return (
    <main className="container" style={{ paddingBlock: "var(--space-16)", maxWidth: 900 }}>
      <div style={{ textAlign: "center", marginBottom: "var(--space-10)" }}>
        <span className="t-eyebrow">Security &amp; Transparency</span>
        <h1 className="t-h1" style={{ marginTop: "var(--space-3)" }}>
          Built to be <span className={styles.accent}>un-ruggable</span> — and un-hackable.
        </h1>
        <p className="t-body-lg" style={{ color: "var(--text-secondary)", maxWidth: 640, margin: "var(--space-4) auto 0" }}>
          A tool that tells you what&apos;s safe has to be safe itself. Here&apos;s exactly how we
          protect you — and how you can verify every word of it.
        </p>
      </div>

      <section className={styles.block}>
        <h2 className={styles.h2}>Our security posture</h2>
        <div className={styles.grid}>
          {posture.map((p) => (
            <div key={p.t} className={styles.card}>
              <span className={styles.check}>✓</span>
              <h3 className={styles.cardT}>{p.t}</h3>
              <p className={styles.cardD}>{p.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.block}>
        <h2 className={styles.h2}>Our promises to you</h2>
        <div className={styles.principles}>
          {principles.map((p) => (
            <div key={p.t} className={styles.principle}>
              <h3 className={styles.cardT}>{p.t}</h3>
              <p className={styles.cardD}>{p.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Phishing education — the real user-side threat */}
      <section className={styles.block}>
        <div className={styles.warn}>
          <h2 className={styles.h2} style={{ marginTop: 0 }}>⚠ How to spot a fake GL1TCH</h2>
          <p className={styles.cardD}>
            The biggest risk isn&apos;t us — it&apos;s a <strong>copycat site</strong> pretending to be us.
          </p>
          <ul className={styles.list}>
            <li><strong>GL1TCH will NEVER ask you to approve a transaction or a token spend.</strong> If a
              &quot;GL1TCH&quot; site asks you to <em>Approve</em>, <em>Confirm</em>, or sign anything that moves
              funds or grants an allowance — it is a scam. Close it.</li>
            <li>The only signature we would ever request is a plain-text <em>message</em> that says it
              proves ownership and moves nothing. Read what you sign.</li>
            <li>Only trust the official domain: <strong>coin-three-mu.vercel.app</strong> and the links on
              our <Link href="/links">official links</Link> page. Admins never DM first.</li>
          </ul>
        </div>
      </section>

      <section className={styles.block}>
        <h2 className={styles.h2}>Responsible disclosure</h2>
        <p className={styles.cardD}>
          Found a vulnerability? We want to hear it before anyone gets hurt. Report it privately via
          our <a href={OFFICIAL.TG_URL} target="_blank" rel="noopener noreferrer">Telegram</a> admins or a
          GitHub security advisory — please don&apos;t disclose publicly until it&apos;s fixed. A formal
          bug-bounty program is on the roadmap.
        </p>
      </section>

      <div className={styles.cta}>
        <Link href="/proof" className={styles.ctaPrimary}>See the live proof →</Link>
        <a href={OFFICIAL.GITHUB_URL} target="_blank" rel="noopener noreferrer" className={styles.ctaGhost}>Read the code ↗</a>
      </div>
    </main>
  );
}
