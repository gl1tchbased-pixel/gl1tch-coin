import type { Metadata } from "next";
import Link from "next/link";
import { Article } from "@/components/learn/Article";

export const metadata: Metadata = {
  title: "Verifiable Randomness for NFT Mints & Allocations (Provably Fair) | GL1TCH",
  description:
    "Minting an NFT collection or running an allocation? Learn how to assign mint order, pick winners, and sample a whitelist with verifiable randomness — so buyers can prove nobody sniped the rares or rigged the list. Free and non-custodial.",
  alternates: { canonical: "/learn/verifiable-randomness-for-nft-mints" },
};

const cta = {
  tool: { prompt: "Assigning mint order or an allocation?", href: "/quantum-core/random", label: "Open the console →" },
  endPrimary: { href: "/quantum-core/random", label: "Run a provably-fair draw" },
  endGhost: { href: "/quantum-core", label: "How it works" },
  related: [
    { href: "/learn/what-is-verifiable-randomness", label: "What is verifiable randomness?" },
    { href: "/learn/how-to-run-a-provably-fair-giveaway", label: "Run a provably-fair giveaway" },
    { href: "/quantum-core/random", label: "Verifiable randomness console" },
  ],
};

export default function Page() {
  return (
    <Article
      slug="verifiable-randomness-for-nft-mints"
      eyebrow="Verifiable Randomness"
      title="Verifiable randomness for NFT mints & allocations"
      intro="Every NFT launch faces the same suspicion: did the team (or an insider bot) snipe the rare traits, and was the whitelist really fair? If your mint order and allocation come from randomness nobody can prove, that suspicion never goes away — and it tanks secondary trust. Verifiable randomness fixes it: you assign order and pick winners from a public, unpredictable seed, and every buyer can verify the result themselves. Here's how to use it for a mint, a whitelist, or an allocation."
      {...cta}
      sections={[
        {
          h: "The three fairness problems in a launch",
          body: (
            <ul>
              <li><strong>Mint order / trait assignment.</strong> Who gets which token ID — and the rare traits — must not be steerable by the team or a bot.</li>
              <li><strong>Whitelist selection.</strong> When demand exceeds spots, sampling the allowlist has to be provably impartial.</li>
              <li><strong>Allocation.</strong> Distributing a fixed supply across applicants needs an auditable, non-favoritist method.</li>
            </ul>
          ),
        },
        {
          h: "Why on-chain randomness must be verifiable",
          body: (
            <p>
              A naive mint uses block data or a private RNG to order tokens — both are gameable. Validators
              can influence block values, and a private script can be re-run until it favors insider wallets.
              <strong> Verifiable randomness</strong> removes the operator&apos;s control: the result is seeded
              by a future public value (from a beacon like <Link href="/learn/what-is-verifiable-randomness">drand</Link>)
              that no one can know at commit time, and it ships with a proof anyone can check. Snipe
              accusations stop being plausible because the math is public.
            </p>
          ),
        },
        {
          h: "How to do it (free, three steps)",
          body: (
            <>
              <ul>
                <li><strong>Commit the inputs.</strong> In the <Link href="/quantum-core/random">Quantum Randomness console</Link>, use a <em>shuffle</em> to randomize mint order over your supply (0…N-1), or <em>Giveaway / Allocation</em> to pick winners from a named applicant list. The list is frozen into a Merkle root and locked to a future drand round.</li>
                <li><strong>Reveal.</strong> When the round finalizes, the order/winners are derived deterministically from that public seed.</li>
                <li><strong>Publish the proof.</strong> Share the proof link (and the embeddable &ldquo;Provably fair&rdquo; badge). Buyers verify in their browser that the seed is authentic and your list wasn&apos;t swapped.</li>
              </ul>
              <p>Programmatic teams can wire it into a mint pipeline with two API calls — see the console&apos;s docs.</p>
            </>
          ),
        },
        {
          h: "What buyers can verify",
          body: (
            <p>
              On the proof page, anyone clicks <em>Verify</em> and their own device checks the drand
              signature, confirms the entrant/supply list matches the committed fingerprint, and re-derives
              the exact order or winners. If a single ID or address had been changed, verification fails
              loudly. That&apos;s the difference between &ldquo;trust our team&rdquo; and &ldquo;here&apos;s
              the proof.&rdquo;
            </p>
          ),
        },
      ]}
      faqs={[
        { q: "How do I make NFT mint order provably fair?", a: "Randomize the order over your supply (0…N-1) with a verifiable shuffle: commit to a future drand round before it exists, then derive the order from that public seed when it finalizes. Publish the proof so buyers can re-derive the exact order and confirm no one was favored. GL1TCH's Quantum Randomness console does this free." },
        { q: "Can I prove a whitelist selection wasn't rigged?", a: "Yes. Freeze the applicant list into a Merkle root, draw the winners from a future public seed, and share the proof link. Anyone can confirm the list matches the committed root and re-derive the same winners. Swapping an address breaks verification." },
        { q: "Do I need Chainlink VRF or a paid oracle for a fair mint?", a: "No. GL1TCH gives you the same verifiable guarantee for free, seeded by the public drand beacon and verifiable in the browser. You can run it by hand or wire the API into your mint; only high-volume API access is gated by holding $GL1TCH." },
        { q: "Is it non-custodial?", a: "Yes. The tool never touches your funds or your buyers' funds — it only produces a provable random result and a shareable proof. Running and verifying a draw is free." },
      ]}
      ctaLine="GL1TCH's Quantum Randomness makes NFT mint order, whitelist selection, and allocations provably fair — seeded by a public beacon, verifiable in the browser, free and non-custodial."
    />
  );
}
