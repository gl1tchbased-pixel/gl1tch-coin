import type { Metadata } from "next";
import Link from "next/link";
import { Article } from "@/components/learn/Article";

export const metadata: Metadata = {
  title: "What Is Know Your Agent (KYA)? AI Agent Trust Explained | GL1TCH",
  description:
    "Know Your Agent (KYA) is the emerging standard for verifying autonomous AI agents before they transact on-chain — identity, provenance, reputation. Learn what KYA is, why the agent economy needs it, and how to check any agent for free.",
  alternates: { canonical: "/learn/what-is-know-your-agent" },
};

const agentCta = {
  tool: { prompt: "Want to check a specific agent wallet?", href: "/agents", label: "Know Your Agent →" },
  endPrimary: { href: "/agents", label: "Check an agent — free" },
  endGhost: { href: "/agents/docs", label: "Integrate the API" },
  related: [
    { href: "/learn/how-to-verify-an-ai-agent", label: "How to verify an AI agent" },
    { href: "/learn/can-ai-agents-be-hacked", label: "Can AI agents be hacked?" },
    { href: "/learn/how-to-check-if-a-token-is-safe", label: "Check if a token is safe" },
  ],
};

export default function Page() {
  return (
    <Article
      slug="what-is-know-your-agent"
      eyebrow="Know Your Agent"
      title="What is Know Your Agent (KYA)?"
      intro="Autonomous AI agents now hold wallets and transact on-chain — swapping, paying, and moving funds without a human clicking confirm. Know Your Agent (KYA) is the emerging standard for answering one question before you let an agent near money: is this agent who it claims to be, and can it be trusted? It's the agent-economy equivalent of KYC, minus the paperwork and the custody."
      {...agentCta}
      sections={[
        {
          h: "Why the agent economy needs KYA",
          body: (
            <p>
              In 2026, a meaningful share of on-chain activity already comes from automated agents,
              and the number is climbing fast. That creates a new problem: an agent is just a wallet
              that acts on its own. You can&apos;t read its intentions, you can&apos;t see a face, and
              a malicious or compromised agent can drain funds at machine speed. Academics call the
              core challenge <strong>bounded autonomy</strong> — letting agents act without making
              markets opaque or unaccountable. KYA is the practical answer.
            </p>
          ),
        },
        {
          h: "The three things KYA checks",
          body: (
            <ul>
              <li><strong>Identity.</strong> Can the agent cryptographically prove it controls its wallet? A signature over a message proves ownership without moving any funds.</li>
              <li><strong>Provenance.</strong> Where has this wallet been? What has it deployed or interacted with? A wallet linked to known scams inherits that history.</li>
              <li><strong>Reputation.</strong> Does its on-chain track record earn trust — or has it burned it? Reputation compounds; it can&apos;t be faked overnight.</li>
            </ul>
          ),
        },
        {
          h: "KYA is a signal, not custody",
          body: (
            <p>
              An important distinction: KYA tells you whether an agent has <em>earned</em> trust — it
              does not hold keys, take custody, or move funds. It&apos;s a reputation and provenance
              layer that rides alongside your wallet or your own agent, giving you a verdict before
              you delegate. Think of it as a credit check for autonomous software, not a vault.
            </p>
          ),
        },
        {
          h: "How to run a KYA check today",
          body: (
            <p>
              GL1TCH turned a proprietary token-safety engine into an agent-trust layer. Paste any
              on-chain agent wallet into <Link href="/agents">Know Your Agent</Link> and get a
              plain-English verdict — trusted, neutral, caution, or unknown — with the reasons. It&apos;s
              free, non-custodial, and there&apos;s a one-call API if you&apos;re building an agent,
              wallet, or dapp. See the <Link href="/agents/docs">developer docs</Link>.
            </p>
          ),
        },
      ]}
      faqs={[
        { q: "Is Know Your Agent the same as KYC?", a: "No. KYC identifies a human for compliance. KYA verifies an autonomous AI agent's wallet — its identity, provenance, and on-chain reputation — so you know whether it's safe to transact with or delegate funds to. It requires no personal data and never takes custody." },
        { q: "Can an agent fake a good KYA score?", a: "Identity is provable by signature, but reputation is built from accumulated on-chain history — which can't be manufactured overnight. A wallet linked to flagged tokens or serial-rug behaviour inherits that record no matter what it claims." },
        { q: "Does KYA touch my keys or funds?", a: "No. KYA is a reputation and provenance signal only. It reads on-chain data and returns a verdict; it never holds keys, takes custody, or moves funds." },
        { q: "How do I check an AI agent for free?", a: "Paste the agent's wallet address into GL1TCH's Know Your Agent tool at coin-three-mu.vercel.app/agents. You get an instant trust verdict with reasons — free and non-custodial." },
      ]}
      ctaLine="GL1TCH's Know Your Agent runs identity, provenance, and reputation checks on any on-chain agent — free, non-custodial, one call to integrate."
    />
  );
}
