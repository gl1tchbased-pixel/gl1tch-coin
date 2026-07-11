import type { Metadata } from "next";
import Link from "next/link";
import { Article } from "@/components/learn/Article";

export const metadata: Metadata = {
  title: "How to Run a Provably-Fair Giveaway (Verifiable Random Winners) | GL1TCH",
  description:
    "A random.org screenshot doesn't prove your giveaway was fair. Learn how to run a provably-fair giveaway with verifiable randomness — commit, reveal, and let anyone check the winners themselves. Free and non-custodial.",
  alternates: { canonical: "/learn/how-to-run-a-provably-fair-giveaway" },
};

const cta = {
  tool: { prompt: "Ready to draw winners nobody can dispute?", href: "/quantum-core/random", label: "Open the console →" },
  endPrimary: { href: "/quantum-core/random", label: "Run a provably-fair draw" },
  endGhost: { href: "/quantum-core", label: "See how it works" },
  related: [
    { href: "/quantum-core/random", label: "Verifiable randomness console" },
    { href: "/learn/how-to-check-if-a-token-is-safe", label: "Check if a token is safe" },
    { href: "/token", label: "Why hold $GL1TCH" },
  ],
};

export default function Page() {
  return (
    <Article
      slug="how-to-run-a-provably-fair-giveaway"
      eyebrow="Provably-Fair Giveaways"
      title="How to run a provably-fair giveaway"
      intro="You ran a giveaway, picked a winner, and posted a screenshot — and half your community assumed it was rigged for a friend. They're not paranoid: a screenshot of a random number generator proves nothing. Anyone can re-roll until they like the result, or just type a name. A provably-fair giveaway removes the doubt entirely: the winner is picked by randomness nobody could know or influence in advance, and anyone can verify the result themselves. Here's how it works and how to run one for free."
      {...cta}
      sections={[
        {
          h: "Why \"trust me, it's random\" isn't enough",
          body: (
            <p>
              Most giveaway tools — a spreadsheet shuffle, a wheel-spinner, a random.org screenshot —
              share one fatal flaw: <strong>the organizer controls the outcome and nothing is
              verifiable after the fact</strong>. You can re-run a picker until a favored wallet wins,
              screenshot the one you like, and no one can tell. Even honest organizers can&apos;t
              <em> prove</em> they were honest. As giveaways get bigger — allocations, whitelists, NFT
              mints — that trust gap turns into accusations, and accusations kill communities.
            </p>
          ),
        },
        {
          h: "What \"provably fair\" actually means",
          body: (
            <>
              <p>
                Provably fair borrows a simple idea from cryptography called <strong>commit-reveal</strong>,
                seeded by public, tamper-proof randomness. It works in three moves:
              </p>
              <ul>
                <li><strong>Commit.</strong> You freeze your entrant list and lock the draw to a <em>future</em> source of randomness that doesn&apos;t exist yet — so no one, including you, can know or steer the result.</li>
                <li><strong>Reveal.</strong> When that randomness is published (by a neutral third party), it seeds the draw and picks the winners deterministically.</li>
                <li><strong>Verify.</strong> Because the inputs are all public, anyone can recompute the exact same winners and confirm the list wasn&apos;t swapped. If a single name was changed, verification fails.</li>
              </ul>
              <p>
                The randomness source matters. GL1TCH uses <strong>drand</strong> — the League of
                Entropy&apos;s threshold-signature beacon, the same kind of public randomness Chainlink
                VRF-style systems rely on. It produces a new, cryptographically-signed random value every
                few seconds that no one can predict or forge.
              </p>
            </>
          ),
        },
        {
          h: "How to run one in three steps (free)",
          body: (
            <>
              <ul>
                <li><strong>1. Paste your entrants.</strong> Open the <Link href="/quantum-core/random">Quantum Randomness console</Link>, choose <em>Giveaway / Allocation</em>, and paste your list — wallets, handles, emails, one per line — and how many winners to draw.</li>
                <li><strong>2. Commit.</strong> Your list is frozen into a cryptographic fingerprint (a Merkle root) and the draw is locked to a future drand round. Nothing about the result is knowable yet.</li>
                <li><strong>3. Reveal &amp; share.</strong> ~A minute later the round finalizes, the winners are drawn, and you get a permanent, shareable proof link (and an embeddable &ldquo;Provably fair&rdquo; badge). Post it — the debate is over.</li>
              </ul>
              <p>
                It&apos;s free to verify and non-custodial: the tool never touches your funds or your
                entrants&apos; funds. It only produces a provable result.
              </p>
            </>
          ),
        },
        {
          h: "How anyone verifies your draw",
          body: (
            <p>
              This is the part that ends disputes. On the proof page, anyone can click{" "}
              <em>Verify in your browser</em> and the math runs on <strong>their</strong> device — it
              checks the drand randomness against the beacon&apos;s public key, confirms your entrant
              list matches the fingerprint you committed, and re-derives the winners. If everything
              matches, they see a green &ldquo;verified&rdquo;. If you had swapped an entrant or faked a
              winner, it fails loudly. Nobody has to trust you — or GL1TCH.
            </p>
          ),
        },
        {
          h: "Beyond giveaways: mints, whitelists, allocations",
          body: (
            <p>
              The same mechanism powers any fair selection: assigning NFT mint order, sampling a
              whitelist, allocating a sale, seeding a tournament bracket, or picking raffle winners.
              Anywhere &ldquo;was it rigged?&rdquo; can be asked, a verifiable draw answers it in
              advance. Builders can automate it with two API calls — see the{" "}
              <Link href="/quantum-core/random">console and docs</Link>. Programmatic use is gated by
              holding <Link href="/token">$GL1TCH</Link>; running and verifying a draw by hand stays free.
            </p>
          ),
        },
      ]}
      faqs={[
        { q: "Isn't a random.org screenshot good enough?", a: "No. A screenshot proves nothing — the organizer can re-roll until a favored entry wins, or simply fake the image, and no one can check afterward. A provably-fair draw commits to a future, third-party random value before the result is known and lets anyone recompute the winners themselves." },
        { q: "How can a giveaway be verified after it's over?", a: "Because every input is public: the frozen entrant list (as a Merkle root), the drand round that seeded it, and the derivation rule. Anyone can re-fetch the drand round, verify its signature, and re-derive the exact winners in their browser. Change one entrant and verification fails." },
        { q: "What is drand and why use it?", a: "drand is the League of Entropy's distributed randomness beacon — a network of independent parties that jointly produce a new, cryptographically-signed random value every few seconds. No single party can predict or forge it, which is exactly what a fair draw needs for its seed." },
        { q: "Is it free? Does it hold my funds?", a: "Running and verifying a draw by hand is free and fully non-custodial — the tool never touches funds, only produces a provable result. High-volume programmatic API access is gated by holding $GL1TCH." },
        { q: "Can I prove a specific person was in the draw?", a: "Yes. The entrant list is committed as a Merkle root, so you can show a specific entry was included in the exact list that produced the winners — without anyone being able to alter it after the fact." },
      ]}
      ctaLine="GL1TCH's Quantum Randomness turns any giveaway, mint, or allocation into a provably-fair draw with a shareable proof — free to run and verify, non-custodial, and impossible to rig."
    />
  );
}
