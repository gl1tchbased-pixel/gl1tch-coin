import type { Metadata } from "next";
import Link from "next/link";
import styles from "./thesis.module.css";

export const metadata: Metadata = {
  title: "Investment Thesis — GL1TCH: the trust layer for the AI-agent economy",
  description:
    "Why GL1TCH: a memecoin with a real product and a data moat, pivoting into 2026's dominant narrative — trust & reputation infrastructure for autonomous on-chain AI agents (Know Your Agent). The thesis, the moat, what's built, and the honest economics.",
  alternates: { canonical: "/thesis" },
};

const STATS = [
  { v: "~$60B", l: "projected AI-token economy by end 2026", s: "external research" },
  { v: "8–12%", l: "of EVM DeFi volume already from agent wallets", s: "Q1 2026 estimates" },
  { v: "129k+", l: "autonomous agents active on-chain", s: "multi-source" },
  { v: "39–50%", l: "of Safe/Gnosis transactions AI-initiated", s: "Safe data" },
];

const MOAT = [
  { t: "Data that compounds", d: "The Signal Graph remembers every deployer and outcome we've scanned. That accumulated history is the reputation layer — and it can't be copied without re-accumulating the data. A network effect on trust." },
  { t: "Primitives we already had", d: "The agent-trust stack needs identity, reputation, and a guardrail. We built all three for tokens (signature-verify, Signal Graph, scanner) and pointed them at agents. Months of a head start, not a pitch deck." },
  { t: "A brand that fits", d: "\"The rogue AI that works for holders\" is the exact posture for an agent-safety product. The meme carries the distribution; the product carries the meme." },
];

const BUILT = [
  { t: "Know Your Agent", d: "Score any on-chain agent — identity + provenance + reputation.", href: "/agents" },
  { t: "Self-registration", d: "Agents sign to prove ownership (moves nothing). Live + verified.", href: "/agents/docs" },
  { t: "Guardrail API + badge", d: "One free call before you trust an agent. Embeddable.", href: "/agents/docs" },
  { t: "Agent directory", d: "The public registry of assessed agents & flagged actors.", href: "/agents/directory" },
  { t: "AI-discoverable API", d: "Machine-readable at /llms.txt — agents self-integrate.", href: "/llms.txt" },
  { t: "The scanner it grew from", d: "Free multi-chain rug scanner + live Rug Radar.", href: "/scan" },
];

export default function ThesisPage() {
  return (
    <main className={styles.page}>
      {/* Hero */}
      <section className={styles.hero}>
        <span className={styles.eyebrow}>Investment Thesis</span>
        <h1 className={styles.title}>
          Most memecoins are a bet on attention.
          <br />
          <span className={styles.signal}>This is a bet on a product with a data moat</span> — in
          2026&apos;s biggest narrative.
        </h1>
        <p className={styles.lede}>
          GL1TCH is the trust &amp; reputation layer for the AI-agent economy. Autonomous agents
          now hold wallets and transact on-chain; nobody can verify one is safe to trust. We built
          the missing layer — <strong>Know Your Agent</strong> — on top of a security-data engine
          we&apos;d already spent months accumulating.
        </p>
        <div className={styles.heroCta}>
          <Link href="/agents" className={styles.btnPrimary}>See the product →</Link>
          <a href="#moat" className={styles.btnGhost}>Why it wins ↓</a>
        </div>
      </section>

      {/* Stat band */}
      <section className={styles.stats}>
        {STATS.map((s) => (
          <div key={s.l} className={styles.stat}>
            <div className={styles.statV}>{s.v}</div>
            <div className={styles.statL}>{s.l}</div>
            <div className={styles.statS}>{s.s}</div>
          </div>
        ))}
        <p className={styles.statsNote}>
          The AI-agent economy is the dominant 2026 crypto narrative — and unlike most, it has
          measurable on-chain usage, not just hype. Figures from external 2026 research; directional.
        </p>
      </section>

      {/* The gap */}
      <section className={styles.section}>
        <span className={styles.kicker}>The gap</span>
        <h2 className={styles.h2}>The agent economy&apos;s #1 unsolved problem is trust.</h2>
        <p className={styles.body}>
          Agents transact autonomously, but the market has no way to answer &quot;is this agent
          legit, in-bounds, and safe to let near funds?&quot; Academics call it <em>bounded
          autonomy</em>; the industry calls it <em>Know Your Agent (KYA)</em>. Institutions are
          already funding it — Ledger&apos;s on-chain agent identity, Mastercard/Visa/Google agent-
          payment standards. It&apos;s an identity, provenance, and reputation problem.
        </p>
        <p className={styles.bodyStrong}>
          Those are the exact primitives we&apos;d already built — for tokens. We pointed them at
          agents.
        </p>
      </section>

      {/* Moat */}
      <section className={styles.section} id="moat">
        <span className={styles.kicker}>Why us · the moat</span>
        <h2 className={styles.h2}>Copy the idea, and you still need our data.</h2>
        <div className={styles.grid3}>
          {MOAT.map((m) => (
            <div key={m.t} className={styles.card}>
              <h3 className={styles.cardT}>{m.t}</h3>
              <p className={styles.cardD}>{m.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Built — proof */}
      <section className={styles.section}>
        <span className={styles.kicker}>Proof, not promises</span>
        <h2 className={styles.h2}>Already built and live — verify every link.</h2>
        <div className={styles.grid3}>
          {BUILT.map((b) => (
            <Link key={b.t} href={b.href} className={`${styles.card} ${styles.cardLink}`}>
              <h3 className={styles.cardT}>{b.t} <span className={styles.arrow}>↗</span></h3>
              <p className={styles.cardD}>{b.d}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Economics */}
      <section className={styles.section}>
        <span className={styles.kicker}>Token value, honestly</span>
        <h2 className={styles.h2}>Real revenue — not points and airdrop loops.</h2>
        <p className={styles.body}>
          The research is blunt: across 159 protocols and six value-accrual models, median 1-year
          returns were negative, and mechanism design mattered far less than <strong>real revenue
          scale</strong>. Points and airdrop loops averaged the worst.
        </p>
        <p className={styles.body}>
          So we don&apos;t pretend a token mechanic creates value. The plan: free base access
          (protection is never gated), then <strong>depth, bulk queries, and the guardrail API
          become paid usage</strong> — usage becomes revenue, and a public, rules-based buyback
          activates once that revenue is real. Built to last, not to farm.
        </p>
      </section>

      {/* Honest risks */}
      <section className={styles.section}>
        <span className={styles.kicker}>What we won&apos;t oversell</span>
        <h2 className={styles.h2}>The honest part.</h2>
        <ul className={styles.risks}>
          <li><strong>Early.</strong> The agent economy is young; demand is proven in usage, not yet in the token. We&apos;re building ahead of the curve — that&apos;s the bet.</li>
          <li><strong>A signal, not custody.</strong> GL1TCH is a reputation &amp; provenance layer, not a hardware wallet or key custody. It never touches keys or funds.</li>
          <li><strong>Not financial advice.</strong> Crypto is high-risk. A trust verdict is a signal, not a guarantee. Always DYOR.</li>
        </ul>
      </section>

      {/* CTA */}
      <section className={styles.finalCta}>
        <h2 className={styles.h2}>Judge the product, not the promise.</h2>
        <div className={styles.heroCta}>
          <Link href="/agents" className={styles.btnPrimary}>Know Your Agent →</Link>
          <Link href="/scan" className={styles.btnGhost}>The free scanner</Link>
          <a href="https://t.me/gl1tch_infected" target="_blank" rel="noopener noreferrer" className={styles.btnGhost}>Telegram</a>
        </div>
        <p className={styles.fine}>
          $GL1TCH · Solana · <code>3HQJwwHvzy8pGkPqGQcb4thZCH88MUCHVVSNtHn6pump</code> · 0% tax ·
          mint &amp; freeze revoked. Not financial advice.
        </p>
      </section>
    </main>
  );
}
