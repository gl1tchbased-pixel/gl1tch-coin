import type { Metadata } from "next";
import Link from "next/link";
import { Article } from "@/components/learn/Article";

export const metadata: Metadata = {
  title: "What Is Verifiable Randomness? (VRF, drand, Quantum RNG) | GL1TCH",
  description:
    "Verifiable randomness is a random result anyone can prove wasn't tampered with — the foundation of fair on-chain mints, raffles, and allocations. Learn what it is, how VRF and drand work, and how to generate it for free.",
  alternates: { canonical: "/learn/what-is-verifiable-randomness" },
};

const cta = {
  tool: { prompt: "Want verifiable randomness right now?", href: "/quantum-core/random", label: "Open the console →" },
  endPrimary: { href: "/quantum-core/random", label: "Generate verifiable randomness — free" },
  endGhost: { href: "/quantum-core", label: "See how it works" },
  related: [
    { href: "/learn/how-to-run-a-provably-fair-giveaway", label: "Run a provably-fair giveaway" },
    { href: "/quantum-core/random", label: "Verifiable randomness console" },
    { href: "/token", label: "Why hold $GL1TCH" },
  ],
};

export default function Page() {
  return (
    <Article
      slug="what-is-verifiable-randomness"
      eyebrow="Verifiable Randomness"
      title="What is verifiable randomness?"
      intro="Ordinary randomness asks you to trust whoever generated it. Verifiable randomness doesn't: it produces a random result together with a cryptographic proof that anyone can check, so nobody — not even the operator — could have predicted or tampered with it. That property is what makes on-chain mints, raffles, lotteries, and allocations actually fair instead of just claiming to be. Here's what it is, how it works, and how to generate it for free."
      {...cta}
      sections={[
        {
          h: "Random vs. verifiably random",
          body: (
            <p>
              Any language can give you a random number — but on a blockchain, &ldquo;trust me, it&apos;s
              random&rdquo; is worthless. Validators, operators, or the person running a giveaway could
              all influence or fake the result, and no one could tell afterward. <strong>Verifiable
              randomness</strong> closes that gap: the output comes bundled with a proof (a digital
              signature) that ties it to a public, unpredictable source. Anyone can verify the proof and
              confirm the number is authentic and untouched — no trust required.
            </p>
          ),
        },
        {
          h: "How it works: commit, reveal, verify",
          body: (
            <>
              <p>The pattern behind every verifiable-randomness system has three steps:</p>
              <ul>
                <li><strong>Commit.</strong> You lock your request to a future, unknowable source of randomness before it exists — so no one can steer the outcome.</li>
                <li><strong>Reveal.</strong> When that randomness is produced by a neutral party and published, it seeds your result deterministically.</li>
                <li><strong>Verify.</strong> Because the seed is public and signed, anyone can recompute your exact result and check the signature. If either was faked, verification fails.</li>
              </ul>
              <p>
                The key is that the seed comes from <em>outside</em> — a source the requester can&apos;t
                control and couldn&apos;t know in advance.
              </p>
            </>
          ),
        },
        {
          h: "VRF, drand, and quantum beacons",
          body: (
            <>
              <p>There are a few ways to source that external randomness:</p>
              <ul>
                <li><strong>Chainlink VRF</strong> — a paid oracle service where a node produces randomness with a proof, widely used for NFT mints and games.</li>
                <li><strong>drand</strong> — the League of Entropy&apos;s public threshold-signature beacon: a network of independent parties jointly emit a new signed random value every few seconds. No single member can predict or forge it. Free and public.</li>
                <li><strong>Quantum beacons</strong> — like NIST&apos;s CURBy, which derives randomness from quantum measurements (Bell tests) for a physically-unpredictable source.</li>
              </ul>
              <p>
                GL1TCH&apos;s <Link href="/quantum-core/random">Quantum Randomness</Link> uses drand for its
                free API and NIST CURBy for reward draws — and lets you verify the result in your own browser.
              </p>
            </>
          ),
        },
        {
          h: "Where verifiable randomness is used",
          body: (
            <ul>
              <li><strong>NFT mints</strong> — assigning token IDs or reveal order fairly, with proof no one snagged the rare traits.</li>
              <li><strong>Raffles &amp; giveaways</strong> — drawing winners a community can independently verify.</li>
              <li><strong>Whitelists &amp; allocations</strong> — sampling or ordering an allowlist for a sale without insider favoritism.</li>
              <li><strong>Games</strong> — loot drops, matchmaking, and mechanics that players can audit.</li>
            </ul>
          ),
        },
        {
          h: "How to generate verifiable randomness for free",
          body: (
            <p>
              You don&apos;t need to run an oracle or write cryptography. Open GL1TCH&apos;s{" "}
              <Link href="/quantum-core/random">Quantum Randomness console</Link>, choose random numbers,
              a shuffle, a pick, or a full giveaway over a named list, and submit. It commits to a future
              drand round, reveals the result, and gives you a shareable proof anyone can verify in-browser.
              Running and verifying by hand is free and non-custodial; high-volume programmatic access via
              the API is gated by holding <Link href="/token">$GL1TCH</Link>.
            </p>
          ),
        },
      ]}
      faqs={[
        { q: "What's the difference between random and verifiable random?", a: "Ordinary randomness requires trusting whoever produced it — they could predict or fake it undetectably. Verifiable randomness ships with a cryptographic proof tying the result to a public, unpredictable source, so anyone can confirm it wasn't tampered with. On-chain, only the verifiable kind is trustworthy." },
        { q: "What is drand?", a: "drand is the League of Entropy's distributed randomness beacon — a network of independent organizations that jointly produce a new, threshold-BLS-signed random value every few seconds. No single party can predict or forge it, which makes it an ideal public seed for fair draws." },
        { q: "Is verifiable randomness the same as Chainlink VRF?", a: "VRF is one implementation — a paid oracle that returns randomness with a proof. drand and quantum beacons are alternative public sources. GL1TCH gives you the same verifiable guarantee free, seeded by drand, and verifiable in your own browser." },
        { q: "Can I get verifiable randomness for free?", a: "Yes. GL1TCH's Quantum Randomness console lets you generate and verify random numbers, shuffles, picks, and giveaways for free and non-custodially. Only high-volume programmatic API access is gated by holding $GL1TCH." },
        { q: "How do I verify a random result myself?", a: "Re-fetch the drand round the result committed to, verify its BLS signature against the published public key, and re-derive the output with the same deterministic function. GL1TCH's proof page does all of this in your browser — zero trust required." },
      ]}
      ctaLine="GL1TCH's Quantum Randomness generates verifiable randomness — numbers, shuffles, picks, and provably-fair giveaways — free, non-custodial, and verifiable in your own browser."
    />
  );
}
