import type { Metadata } from "next";
import Link from "next/link";
import { ApiKeyMinter } from "@/components/web3/ApiKeyMinter";
import styles from "./token.module.css";

export const metadata: Metadata = {
  title: "Why hold $GL1TCH — the honest investment case",
  description:
    "A useful product doesn't make a valuable token. Here's how $GL1TCH is engineered to earn its price: required in-product utility (the access key to depth) + a planned, revenue-driven value-accrual mechanism (GMX / Chainlink model) — with radical honesty about what's live vs. planned.",
  alternates: { canonical: "/token" },
};

// The two questions serious investors actually interrogate (from diligence frameworks).
const PILLARS = [
  {
    n: "01",
    q: "Is the token REQUIRED?",
    a: "A token that exists mainly to speculate — no required use inside the product — is a red flag. $GL1TCH is the access key: the free tools are the funnel; holding unlocks the depth serious users need.",
  },
  {
    n: "02",
    q: "Does value ACCRUE to it?",
    a: "Charging fees does not, by itself, reach holders (Uniswap: $48M fees → $0 to UNI holders). Value accrual must be engineered. Ours is designed and honestly staged — real, then routed.",
  },
];

const UTILITY = [
  { t: "Signal Graph depth", d: "Early-rug alerts + full deployer reputation history — the data moat that compounds with every scan." },
  { t: "Risk-API access", d: "Bulk + programmatic scanning depth and rate — the CertiK-SkyInsights lane, but token-gated." },
  { t: "Verifiable randomness API", d: "Provably-fair RNG-as-a-service (drand-seeded, BLS-verifiable) for mints, raffles & allocations — the Chainlink-VRF lane, holder-gated. Plus Quantum Draw entry." },
  { t: "Know Your Agent", d: "Agent trust scoring depth + API keys for the AI-agent economy." },
  { t: "Sustained-holding tiers", d: "A 7-day average balance gate (anti-gaming) — a flash-buy unlocks nothing." },
];

const ACCRUAL = [
  { t: "Revenue source", d: "The risk-API + verifiable-randomness (\"Draw-as-a-service\") + agent-trust API — paid B2B usage, the proven security-sector model.", tag: "designed" },
  { t: "The mechanism", d: "Route real fees into token demand — a fee-to-buyback (Chainlink Payment Abstraction / Sky Smart Burn) or staking-for-fee-share (GMX pays stakers 27% of real fees, $134M+ distributed).", tag: "planned" },
  { t: "The honesty", d: "NOT live yet. It activates only when real revenue exists, after a third-party audit and founder approval. We will never pretend usage magically lifts the price — that claim is false and we won't make it.", tag: "explicit" },
];

const TRUST = [
  { t: "Tamper-evident Beacon", d: "Every draw event hash-chained (Twine-style). Edit anything and the chain breaks — recomputed in your browser.", href: "/quantum-core/beacon" },
  { t: "Verify, don't trust", d: "Winners, quantum sources, the risk verdicts — all recomputable on your device. Zero trust in us.", href: "/quantum-core/draw" },
  { t: "We scan ourselves", d: "Public self-scan + proof. We hold our own token to the same standard.", href: "/proof" },
  { t: "Audit — planned", d: "A third-party audit of the crypto + non-custodial claims is the anonymous-team trust substitute.", href: "/security" },
];

const SCORECARD = [
  { k: "Required in-product utility", v: "Live — the access key to depth", s: "✓" },
  { k: "Engineered value accrual", v: "Designed — activates on real revenue (fee→buyback / stake)", s: "⏳", href: "/buyback" },
  { k: "Traction", v: "Early, but published live", s: "📈", href: "/network" },
  { k: "Team", v: "Anonymous — substituted by verifiability + planned audit", s: "🔒" },
  { k: "Non-custodial · no fake numbers", v: "By design — never key custody, never invented metrics", s: "✓" },
];

// The diligence questions, answered honestly. Also emitted as FAQPage JSON-LD for rich results.
const FAQ = [
  {
    q: "Is holding $GL1TCH actually required, or just optional?",
    a: "Required for depth. The free human tools (scanner, quantum pulse, beacon) stay free — that's the funnel. But programmatic/bulk API throughput, verifiable randomness + allocation, Signal Graph deployer history, and the sustained-holding rank tiers all require holding $GL1TCH. The token is the access key, not a decoration.",
  },
  {
    q: "Does value actually accrue to the token?",
    a: "Honestly: the required-utility half is live; the value-accrual half is designed and staged, not live. The plan is to route real revenue (risk-API, randomness-as-a-service, agent-trust API) into token demand via a fee-to-buyback or fee-share mechanism, on the proven Chainlink / Sky / GMX templates. It activates ONLY on real revenue, after a third-party audit and founder approval. We never claim that usage magically lifts the price — that claim is false and we don't make it.",
  },
  {
    q: "The team is anonymous — why should an investor trust it?",
    a: "Trust is built through verifiability, not doxxing. Winners, quantum seeds, and risk verdicts are all recomputable on your own device; the code is open, wallets are public, and a third-party audit of the crypto + non-custodial claims is planned. Serious capital has backed anonymous teams that proved competence on-chain (LooksRare, samczsun).",
  },
  {
    q: "Is my wallet or my funds ever at risk?",
    a: "No — the system is non-custodial by design and it's a CI-enforced invariant. Every gate works by a wallet signing a message that proves ownership and moves nothing; there is no staking contract, no lockup, and no approval that could move funds. Keys and ranks gate access and rate, never assets.",
  },
  {
    q: "What is live today versus planned?",
    a: "Live: the multi-chain scanner, Signal Graph, Know Your Agent, the full Quantum Core (Vault, Draw, Seal, Forge), verifiable Randomness + provably-fair Allocation, metered $GL1TCH-gated API keys, and a tamper-evident public Beacon. Planned (founder + audit-gated): the fee-to-holder value-accrual mechanism and a third-party audit.",
  },
  {
    q: "How is the randomness provably fair?",
    a: "Your request commits to a FUTURE drand round that doesn't exist yet, so nobody — including us — can bias the seed. When that round finalizes it seeds the result deterministically. Every result ships with a proof (the drand round + BLS signature) that you BLS-verify and re-derive in your own browser. Zero trust in GL1TCH.",
  },
  {
    q: "What are the risks?",
    a: "$GL1TCH is a high-risk, internet-native asset: tiny market cap, thin liquidity, and early traction. Value is driven by attention and adoption, not cash flows, and could go to zero. This page is radically honest by design — it is not financial advice, and you should never commit funds you can't afford to lose.",
  },
];

export default function TokenPage() {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
  return (
    <main className={styles.page}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <header className={styles.hero}>
        <span className={styles.eyebrow}>The investment case · radically honest</span>
        <h1 className={styles.title}>
          Why hold <span className={styles.signal}>$GL1TCH</span>?
        </h1>
        <p className={styles.lede}>
          A useful product doesn&apos;t make a valuable token — value accrual is a separate, engineered
          pillar. Here is exactly how $GL1TCH is designed to earn its price, what&apos;s live today, and
          what&apos;s planned. No &quot;usage automatically pumps the price&quot; fairy tale — that claim
          is false, and we won&apos;t make it.
        </p>
      </header>

      <section className={styles.pillars}>
        {PILLARS.map((p) => (
          <article key={p.n} className={styles.pillar}>
            <span className={styles.pillarN}>{p.n}</span>
            <h2 className={styles.pillarQ}>{p.q}</h2>
            <p className={styles.pillarA}>{p.a}</p>
          </article>
        ))}
      </section>

      <section className={styles.section}>
        <span className={styles.kicker}>Pillar 01 · live today</span>
        <h2 className={styles.h2}>The token is the access key.</h2>
        <p className={styles.body}>
          The scanner, the quantum pulse, the beacon — all free. That&apos;s the funnel. Holding
          $GL1TCH unlocks the <strong>depth</strong> that serious users and integrators need:
        </p>
        <div className={styles.grid}>
          {UTILITY.map((u) => (
            <div key={u.t} className={styles.card}>
              <h3 className={styles.cardT}>{u.t}</h3>
              <p className={styles.cardD}>{u.d}</p>
            </div>
          ))}
        </div>

        <div className={styles.mintBox}>
          <div>
            <span className={styles.mintTag}>live now</span>
            <h3 className={styles.cardT}>Mint your API key</h3>
            <p className={styles.cardD}>
              The free human scanner stays free. But programmatic / bulk throughput is token-gated:
              prove a sustained $GL1TCH balance and mint a rate-tiered key (higher tier → more
              requests/min). This is the token&apos;s required utility, live — usage demand becomes
              token demand.
            </p>
          </div>
          <ApiKeyMinter />
        </div>
      </section>

      <section className={styles.section}>
        <span className={styles.kicker}>Pillar 02 · engineered &amp; staged</span>
        <h2 className={styles.h2}>Value accrual, built — not assumed.</h2>
        <p className={styles.body}>
          The mechanisms that actually linked usage to token demand all share one trait: real revenue
          is <strong>programmatically routed</strong> into the token. We&apos;re building on those exact
          templates — and we&apos;re honest about the sequence:
        </p>
        <ol className={styles.steps}>
          {ACCRUAL.map((a) => (
            <li key={a.t} className={styles.step}>
              <span className={styles.stepTag} data-tag={a.tag}>{a.tag}</span>
              <div>
                <h3 className={styles.cardT}>{a.t}</h3>
                <p className={styles.cardD}>{a.d}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className={styles.section}>
        <span className={styles.kicker}>Trust · anonymous, verifiable</span>
        <h2 className={styles.h2}>Serious money has backed anonymous teams.</h2>
        <p className={styles.body}>
          LooksRare raised ~1,500 ETH anonymously; samczsun earned top-tier credibility purely through
          on-chain competence. Trust is built through <strong>verifiability</strong>, not doxxing. Ours:
        </p>
        <div className={styles.grid}>
          {TRUST.map((t) => (
            <Link key={t.t} href={t.href} className={styles.cardLink}>
              <h3 className={styles.cardT}>{t.t}</h3>
              <p className={styles.cardD}>{t.d}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <span className={styles.kicker}>Honest scorecard</span>
        <h2 className={styles.h2}>Where we stand — no spin.</h2>
        <div className={styles.score}>
          {SCORECARD.map((r) => (
            <div key={r.k} className={styles.scoreRow}>
              <span className={styles.scoreMark}>{r.s}</span>
              <span className={styles.scoreK}>{r.k}</span>
              {r.href ? (
                <Link href={r.href} className={styles.scoreV}>{r.v} →</Link>
              ) : (
                <span className={styles.scoreV}>{r.v}</span>
              )}
            </div>
          ))}
        </div>
        <p className={styles.note}>
          Built on proven templates — CertiK (risk-API), Chainlink · Sky · GMX (value-accrual),
          Chainlink VRF (verifiable randomness) — honestly labelled. Not financial advice.
        </p>
      </section>

      <section className={styles.section}>
        <span className={styles.kicker}>Investor FAQ</span>
        <h2 className={styles.h2}>The questions, answered honestly.</h2>
        <div className={styles.faq}>
          {FAQ.map((f) => (
            <details key={f.q} className={styles.faqItem}>
              <summary className={styles.faqQ}>{f.q}</summary>
              <p className={styles.faqA}>{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <div className={styles.cta}>
        <Link href="/quantum-core" className={styles.btnPrimary}>See the product →</Link>
        <Link href="/thesis" className={styles.btnGhost}>Read the sector thesis</Link>
        <Link href="/network" className={styles.btnGhost}>Live traction</Link>
      </div>
    </main>
  );
}
