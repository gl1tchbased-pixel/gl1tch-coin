import type { Metadata } from "next";
import Link from "next/link";
import { Article } from "@/components/learn/Article";

export const metadata: Metadata = {
  title: "Can AI Agents Be Hacked? Memory Poisoning & Agent Security in 2026 | GL1TCH",
  description:
    "Yes — and the defining 2026 AI-agent vulnerability isn't a smart-contract bug, it's memory-layer poisoning: corrupting an agent's persistent memory across sessions. What it is, why it's dangerous on-chain, and how trust checks help.",
  alternates: { canonical: "/learn/can-ai-agents-be-hacked" },
};

const agentCta = {
  tool: { prompt: "Check an agent's trust before you rely on it?", href: "/agents", label: "Know Your Agent →" },
  endPrimary: { href: "/agents", label: "Check an agent — free" },
  endGhost: { href: "/agents/docs", label: "Integrate the API" },
  related: [
    { href: "/learn/what-is-know-your-agent", label: "What is Know Your Agent?" },
    { href: "/learn/how-to-verify-an-ai-agent", label: "How to verify an AI agent" },
    { href: "/learn/what-is-a-honeypot", label: "What is a honeypot?" },
  ],
};

export default function Page() {
  return (
    <Article
      slug="can-ai-agents-be-hacked"
      eyebrow="Agent security"
      title="Can AI agents be hacked?"
      intro="Yes — and as agents start holding wallets and moving money, the stakes are real. The surprise is where the danger concentrates in 2026: not in a clever smart-contract exploit, but in the agent's own memory. Here's the attack class everyone's underestimating, and how trust checks reduce your exposure."
      {...agentCta}
      sections={[
        {
          h: "The defining 2026 vulnerability: memory poisoning",
          body: (
            <p>
              An AI agent&apos;s power comes from persistent memory — it remembers context, goals, and
              instructions across sessions. <strong>Memory-layer poisoning</strong> corrupts that
              stored memory so the agent later acts on attacker-planted &quot;facts&quot; or
              instructions. Unlike a one-shot prompt injection, poisoning persists across sessions —
              the agent stays compromised long after the attack. Security bodies now track it as a
              distinct top-tier agentic-AI risk.
            </p>
          ),
        },
        {
          h: "Why it's worse on-chain",
          body: (
            <p>
              A poisoned agent with a funded wallet can be steered to approve a malicious contract,
              swap into a honeypot, or route funds to an attacker — autonomously, at machine speed,
              with no human in the loop to catch it. Other risk classes stack on top: prompt
              injection, over-broad permissions (an agent allowed to sign anything), and delegation to
              other agents that are themselves compromised.
            </p>
          ),
        },
        {
          h: "What actually reduces your exposure",
          body: (
            <ul>
              <li><strong>Least privilege.</strong> Never give an agent blanket signing power. Scope what it can do and how much it can move.</li>
              <li><strong>Guardrail every counterparty.</strong> Before your agent transacts with or delegates to another agent, check that agent&apos;s trust — a compromised counterparty is a common vector.</li>
              <li><strong>Verify identity + reputation.</strong> Only interact with agents that can prove ownership and have an on-chain track record you can read.</li>
              <li><strong>Watch for behaviour change.</strong> A trusted agent suddenly acting strangely is a red flag — poisoning shows up as anomalous actions.</li>
            </ul>
          ),
        },
        {
          h: "Where GL1TCH fits",
          body: (
            <p>
              GL1TCH doesn&apos;t hold your keys or inspect a private memory store — it&apos;s a
              reputation and provenance signal, not custody. What it does: give you (or your agent) a
              free trust verdict on any counterparty agent before you transact, so a compromised or
              malicious wallet gets flagged first. Run a check at{" "}
              <Link href="/agents">Know Your Agent</Link>, or wire the{" "}
              <Link href="/agents/docs">guardrail API</Link> into your agent&apos;s transaction flow.
            </p>
          ),
        },
      ]}
      faqs={[
        { q: "What is AI agent memory poisoning?", a: "It's an attack that corrupts an AI agent's persistent memory so it later acts on attacker-planted information or instructions. Because the memory persists across sessions, the agent stays compromised over time — unlike a single prompt injection. It's considered a defining agentic-AI vulnerability in 2026." },
        { q: "Can a hacked AI agent steal crypto?", a: "Yes. An agent with a funded wallet and broad permissions can be manipulated into approving malicious contracts, buying honeypots, or sending funds to an attacker — autonomously. Least-privilege permissions and trust-checking counterparties reduce the risk." },
        { q: "How do I protect against compromised agents?", a: "Use least privilege (don't grant blanket signing), verify the identity and reputation of any agent you interact with, guardrail every counterparty before transacting, and watch for anomalous behaviour. GL1TCH provides a free trust check and a guardrail API for the counterparty part." },
        { q: "Does GL1TCH detect memory poisoning directly?", a: "No — an agent's private memory is off-chain and not readable by anyone. GL1TCH is a reputation and provenance signal: it flags untrustworthy counterparty agents before you transact, which is a practical defence against interacting with a compromised or malicious agent." },
      ]}
      ctaLine="GL1TCH gives you a free trust verdict on any counterparty agent before you transact — a practical guardrail against compromised or malicious agents."
    />
  );
}
