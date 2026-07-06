import type { Metadata } from "next";
import Link from "next/link";
import { Article } from "@/components/learn/Article";

export const metadata: Metadata = {
  title: "How to Verify an AI Agent On-Chain (Before It Touches Funds) | GL1TCH",
  description:
    "Before you let an autonomous AI agent trade, pay, or move your funds, verify it. A practical checklist: identity, wallet age, funding, deployer history, and reputation — plus a free one-call trust check.",
  alternates: { canonical: "/learn/how-to-verify-an-ai-agent" },
};

const agentCta = {
  tool: { prompt: "Verify a specific agent wallet now?", href: "/agents", label: "Check it free →" },
  endPrimary: { href: "/agents", label: "Verify an agent — free" },
  endGhost: { href: "/agents/docs", label: "Integrate the API" },
  related: [
    { href: "/learn/what-is-know-your-agent", label: "What is Know Your Agent?" },
    { href: "/learn/can-ai-agents-be-hacked", label: "Can AI agents be hacked?" },
    { href: "/learn/how-to-spot-a-rug-pull", label: "How to spot a rug pull" },
  ],
};

export default function Page() {
  return (
    <Article
      slug="how-to-verify-an-ai-agent"
      eyebrow="Agent verification"
      title="How to verify an AI agent on-chain"
      intro="An autonomous agent about to touch your funds deserves the same scrutiny as a new token — more, actually, because it can act at machine speed. Here's the practical checklist to verify any on-chain AI agent before you trust it, and how to do all of it in one free call."
      {...agentCta}
      sections={[
        {
          h: "1. Can it prove its identity?",
          body: (
            <p>
              A legitimate agent can sign a message with its own keypair to prove it controls its
              wallet — no funds move, no access is granted, it just proves ownership. An agent that
              won&apos;t or can&apos;t prove identity is an unknown; treat &quot;unverified&quot; as a
              reason for caution, not a green light. Absence of a flag is not proof of safety.
            </p>
          ),
        },
        {
          h: "2. Check the wallet's age and funding",
          body: (
            <p>
              A brand-new wallet with no history has nothing to trust yet. Where did its funds come
              from — a reputable source, or a chain of fresh wallets and a mixer? New + anonymously
              funded is a lower-confidence signal. Established wallets with a clean, readable history
              earn more benefit of the doubt.
            </p>
          ),
        },
        {
          h: "3. Look at what it has deployed or touched",
          body: (
            <p>
              This is the signal most people miss and the one that matters most. If the agent&apos;s
              wallet has deployed tokens that turned out to be rugs — or is clustered with wallets
              that have — that track record follows it. A single scanner looking at one token
              can&apos;t see this; you need cross-history memory. GL1TCH&apos;s{" "}
              <Link href="/agents">Signal Graph</Link> remembers every deployer it has assessed, so a
              repeat-rug wallet lights up even on a fresh action.
            </p>
          ),
        },
        {
          h: "4. Get one verdict instead of five tabs",
          body: (
            <p>
              You could check identity, age, funding, and history by hand across block explorers — or
              paste the agent wallet into <Link href="/agents">Know Your Agent</Link> and get a single
              plain-English trust verdict with the reasons, free. Building an agent, wallet, or dapp?
              One API call gives you the same guardrail before any transaction — see the{" "}
              <Link href="/agents/docs">docs</Link>.
            </p>
          ),
        },
      ]}
      faqs={[
        { q: "How do I know if an AI agent is safe?", a: "Verify four things: can it prove wallet ownership (identity), how old and how funded the wallet is, whether it has deployed or interacted with known scams (provenance), and its accumulated on-chain reputation. GL1TCH checks all four in one free call at coin-three-mu.vercel.app/agents." },
        { q: "Can I verify an agent without giving it access to my wallet?", a: "Yes. Verification is read-only — you check the agent's public wallet address. The agent proving its own identity is also non-custodial: it signs a message that moves no funds and grants no access." },
        { q: "What does an 'unknown' agent verdict mean?", a: "It means GL1TCH has no trust signal for that wallet yet — no history, no verified identity. Unknown is not a safety guarantee; it's a reason to be careful, especially before delegating funds." },
        { q: "Is there an API to verify agents automatically?", a: "Yes. GET /api/agent/check?address=<wallet> returns a JSON verdict (level, score, reasons). Use it as a guardrail before an agent transacts. Free — see coin-three-mu.vercel.app/agents/docs." },
      ]}
      ctaLine="GL1TCH verifies any on-chain AI agent — identity, provenance, and reputation — in one free, non-custodial call."
    />
  );
}
