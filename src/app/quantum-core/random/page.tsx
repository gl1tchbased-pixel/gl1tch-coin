import type { Metadata } from "next";
import Link from "next/link";
import { RandomnessConsole } from "@/components/web3/RandomnessConsole";
import styles from "./random.module.css";

export const metadata: Metadata = {
  title: "Quantum Randomness — verifiable RNG-as-a-service | GL1TCH",
  description:
    "Holder-gated, provably-fair randomness seeded by the drand quantum-grade beacon. Commit to a future round, reveal on maturity, and verify the result in your own browser (BLS-check the seed + re-derive the output). Free, non-custodial, zero-trust.",
  alternates: { canonical: "/quantum-core/random" },
};

const USE_CASES = [
  { t: "NFT mint order", d: "Assign token IDs or reveal order with a seed no one — team included — could pick in advance." },
  { t: "Raffles & giveaways", d: "Draw winners from an entry list with a proof each entrant can check independently." },
  { t: "Allocation & whitelist", d: "Fairly order or sample an allowlist for a sale; publish the proof, end the “was it rigged?” debate." },
  { t: "Games & mechanics", d: "Dice, loot tables, matchmaking seeds — deterministic, reproducible, and auditable after the fact." },
];

const STEPS = [
  { n: "01", t: "Commit", d: "Your request freezes a spec + salt and targets a FUTURE drand round that does not exist yet. The requestId is the hash of that commitment." },
  { n: "02", t: "Wait", d: "~60 seconds later that round finalizes on the League-of-Entropy beacon. Nobody could have known its value at commit time." },
  { n: "03", t: "Reveal", d: "The round’s BLS-verified randomness seeds your output deterministically: output = derive(seed, requestId, spec)." },
  { n: "04", t: "Verify", d: "Anyone re-fetches the round, BLS-checks it against the published public key, and re-derives your exact result. Zero trust in GL1TCH." },
];

const appJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "GL1TCH Quantum Randomness",
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Web",
  url: "https://coin-three-mu.vercel.app/quantum-core/random",
  description:
    "Holder-gated, provably-fair verifiable randomness-as-a-service seeded by the drand quantum-grade beacon. Commit to a future round, reveal on maturity, and verify the result in your own browser. Free, non-custodial, zero-trust.",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  isAccessibleForFree: true,
  featureList: [
    "Verifiable random integers, shuffles, and picks",
    "Provably-fair giveaways and allocations",
    "In-browser BLS verification + re-derivation",
    "Shareable, embeddable proof",
  ],
};

export default function RandomPage() {
  return (
    <main className={styles.page}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(appJsonLd) }} />
      <header className={styles.hero}>
        <span className={styles.eyebrow}>Quantum Core · verifiable RNG-as-a-service</span>
        <h1 className={styles.title}>
          Randomness anyone can <span className={styles.signal}>verify</span> — nobody can rig.
        </h1>
        <p className={styles.lede}>
          Request a random number, shuffle, or winner. It’s committed to a <em>future</em> quantum-grade
          drand round, revealed when that round finalizes, and provable on your own device — BLS-check the
          seed, re-derive the output. This is the Chainlink-VRF pattern, made free, non-custodial, and
          holder-gated with $GL1TCH.
        </p>
      </header>

      <section className={styles.consoleWrap}>
        <RandomnessConsole />
      </section>

      <section className={styles.section}>
        <span className={styles.kicker}>How it stays fair</span>
        <h2 className={styles.h2}>Commit → reveal → verify.</h2>
        <div className={styles.steps}>
          {STEPS.map((s) => (
            <div key={s.n} className={styles.step}>
              <span className={styles.stepN}>{s.n}</span>
              <h3 className={styles.stepT}>{s.t}</h3>
              <p className={styles.stepD}>{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <span className={styles.kicker}>What it’s for</span>
        <h2 className={styles.h2}>A paying primitive, priced at zero.</h2>
        <p className={styles.body}>
          Verifiable randomness is a real market (Chainlink VRF powers NFT mints, raffles, and allocations).
          We give the same guarantee for free — the token gates <em>throughput</em>, not the feature.
        </p>
        <div className={styles.grid}>
          {USE_CASES.map((u) => (
            <div key={u.t} className={styles.card}>
              <h3 className={styles.cardT}>{u.t}</h3>
              <p className={styles.cardD}>{u.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <span className={styles.kicker}>Integrate it</span>
        <h2 className={styles.h2}>Two calls. A proof anyone can check.</h2>
        <p className={styles.body}>
          Mint a key on <Link href="/token" className={styles.inlineLink}>/token</Link> (needs a sustained
          Infected+ balance), then:
        </p>
        <pre className={styles.code}>
          <code>{`# 1) Commit a request (holder-gated)
curl -X POST https://coin-three-mu.vercel.app/api/random/request \\
  -H "x-gl1tch-key: gk_your_key" \\
  -H "content-type: application/json" \\
  -d '{"spec":{"kind":"pick","n":5000,"k":10},"salt":"mint-2"}'
# → { id, status:"pending", targetRound, availableInMs, commitmentString }

# 2) Reveal on maturity (public — anyone can read)
curl https://coin-three-mu.vercel.app/api/random/<id>
# → { status:"fulfilled", result:{ values:[…] },
#     proof:{ round, randomness, signature } }`}</code>
        </pre>
        <p className={styles.note}>
          Specs: <code>{`{kind:"ints",min,max,count}`}</code> · <code>{`{kind:"shuffle",n}`}</code> ·{" "}
          <code>{`{kind:"pick",n,k}`}</code>. Verify a result yourself by BLS-checking the drand round and
          recomputing <code>derive(seed, requestId, spec)</code> — the exact function runs in the console above,
          in your browser.
        </p>
        <div className={styles.cta}>
          <Link href="/token" className={styles.btnPrimary}>Mint an API key →</Link>
          <Link href="/quantum-core" className={styles.btnGhost}>← Quantum Core</Link>
          <Link href="/quantum-core/beacon" className={styles.btnGhost}>Public Beacon</Link>
        </div>
      </section>
    </main>
  );
}
