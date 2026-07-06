import type { Metadata } from "next";
import Link from "next/link";
import { AgentCheck } from "@/components/web3/AgentCheck";
import styles from "./agents.module.css";

export const metadata: Metadata = {
  title: "Agent Trust Layer — Know Your Agent (KYA) — GL1TCH",
  description:
    "KYA — Know Your Agent for on-chain AI. Autonomous agents transact on-chain, but nobody can verify one is legit, reputable, or safe to let near funds. GL1TCH scores agent wallets on the two trust-stack layers you can't fake — provenance & reputation — from accumulated security data.",
  alternates: { canonical: "/agents" },
};

const primitives = [
  { t: "Identity", d: "An agent proves it controls its wallet with a signature — no fund access, just proof it is who it claims. The verification rail we already run for holders, pointed at agents." },
  { t: "Reputation", d: "The Signal Graph already remembers every deployer and outcome we've scanned. An agent wallet linked to flagged tokens or serial-rug behaviour inherits that record — a track record you can't fake." },
  { t: "Guardrail", d: "One call before you transact with, hire, or fund an agent: 'is this safe?' — a plain-English trust verdict powered by our scan engine + the graph." },
];

export default function AgentsPage() {
  return (
    <main className="container" style={{ paddingBlock: "var(--space-16)", maxWidth: 900 }}>
      <div style={{ textAlign: "center", marginBottom: "var(--space-10)" }}>
        <span className="t-eyebrow">Agent Trust Layer · Know Your Agent</span>
        <h1 className="t-h1" style={{ marginTop: "var(--space-3)" }}>
          <span className={styles.accent}>KYA</span> — Know Your Agent, for on-chain AI.
        </h1>
        <p className="t-body-lg" style={{ color: "var(--text-secondary)", maxWidth: 680, margin: "var(--space-4) auto 0" }}>
          Autonomous agents now hold wallets and transact on-chain — but nobody can tell if an
          agent is legit, reputable, or safe to let near funds. The agent-trust stack has eight
          layers; GL1TCH owns the two you can&apos;t fake: <strong>provenance &amp; reputation</strong>,
          built from the security data we&apos;ve already accumulated.
        </p>
      </div>

      {/* The live lookup — real, working v0 */}
      <section className={styles.lookup}>
        <h2 className={styles.lookupTitle}>Check an agent&apos;s trust</h2>
        <p className={styles.lookupSub}>Paste an on-chain agent wallet. Get a trust verdict — identity + deploy track record.</p>
        <AgentCheck />
      </section>

      <section className={styles.block}>
        <h2 className={styles.h2}>Three primitives — already ours</h2>
        <div className={styles.grid}>
          {primitives.map((p) => (
            <div key={p.t} className={styles.card}>
              <h3 className={styles.cardT}>{p.t}</h3>
              <p className={styles.cardD}>{p.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.block}>
        <div className={styles.thesis}>
          <h2 className={styles.h2} style={{ marginTop: 0 }}>Why this, why us</h2>
          <p className={styles.cardD}>
            The 2026 agent economy&apos;s hardest unsolved problem is <strong>bounded autonomy</strong> —
            letting agents act without making markets opaque or unaccountable. That is a trust,
            identity, and reputation problem. We spent this whole build turning rug detection into
            a reputation graph, a scan engine, and a signature-based identity rail. The same
            primitives, aimed at agents, are a moat: copying us means rebuilding our data.
          </p>
          <p className={styles.cardD}>
            Free to check. Deeper queries and the guardrail API tie to holding — usage becomes
            revenue, revenue funds the token. No points, no airdrop loops (they don&apos;t work).
          </p>
          <p className={styles.cardD} style={{ fontSize: "0.85rem", opacity: 0.7 }}>
            <strong>What we are, honestly:</strong> a reputation &amp; provenance signal — not key
            custody or a hardware wallet. We tell you whether an agent has earned trust; we never
            touch its keys or yours.
          </p>
        </div>
      </section>

      {/* Roadmap + honest economics */}
      <section className={styles.block}>
        <h2 className={styles.h2}>The stack — what&apos;s live, what&apos;s next</h2>
        <div className={styles.grid}>
          <div className={styles.card}>
            <h3 className={styles.cardT}>Live now</h3>
            <p className={styles.cardD}>
              <strong>Identity</strong> (sign-to-register), <strong>Provenance &amp; Reputation</strong>
              (Signal Graph track record), and the <strong>Guardrail</strong> (check API + embeddable
              badge). Free.
            </p>
          </div>
          <div className={styles.card}>
            <h3 className={styles.cardT}>Next</h3>
            <p className={styles.cardD}>
              Capability &amp; authority attestations, a recourse/dispute registry, and awareness for
              the 2026 agent threat that isn&apos;t a contract bug — <strong>memory-layer poisoning</strong>
              (OWASP Agentic Top-10 ASI06).
            </p>
          </div>
          <div className={styles.card}>
            <h3 className={styles.cardT}>Economics, honestly</h3>
            <p className={styles.cardD}>
              Token mechanics alone don&apos;t create value — only <strong>real revenue</strong> does.
              So depth (bulk queries, the guardrail API) becomes paid usage; a public, rules-based
              buyback activates once revenue is real. No points, no airdrop loops.
            </p>
          </div>
        </div>
      </section>

      {/* Developer / integration — the infrastructure story */}
      <section className={styles.block}>
        <h2 className={styles.h2}>Build on it</h2>
        <p className={styles.cardD} style={{ marginBottom: "var(--space-4)" }}>
          The Agent Trust Layer is an open API. Any agent framework, wallet, or dapp can query an
          agent&apos;s trust before letting it transact — and any agent can register itself.
        </p>
        <div className={styles.code}>
          <div className={styles.codeHead}>Check an agent&apos;s trust</div>
          <pre>{`GET /api/agent/check?address=<wallet>&chain=solana
→ { score, level: "trusted|neutral|caution|unknown", reasons[] }`}</pre>
        </div>
        <div className={styles.code}>
          <div className={styles.codeHead}>Register an agent (it signs, proving ownership — moves nothing)</div>
          <pre>{`const issued = Date.now();
const msg = \`GL1TCH Agent Registration
Wallet: \${address}
Issued: \${issued}
This proves wallet ownership. It moves no funds and grants no access.\`;
const signature = bs58.encode(nacl.sign.detached(utf8(msg), secretKey));

POST /api/agent/register
{ address, chain: "solana", issued, signature }`}</pre>
        </div>
        <div className={styles.code}>
          <div className={styles.codeHead}>Guardrail widget — drop a live trust badge anywhere (links to the agent&apos;s profile)</div>
          <pre>{`<a href="https://coin-three-mu.vercel.app/agents/solana-<wallet>">
  <img src="https://coin-three-mu.vercel.app/api/agent/badge?address=<wallet>&chain=solana"
       alt="GL1TCH Agent Trust" width="360" height="84" />
</a>`}</pre>
        </div>
        <p className={styles.cardD} style={{ marginTop: "var(--space-3)", fontSize: "0.85rem", opacity: 0.7 }}>
          v1 — read + register are live and free. Guardrail SDK, attestation network, and
          holding-gated depth are next. Not financial advice.
        </p>
      </section>

      <div className={styles.cta}>
        <Link href="/scan" className={styles.ctaGhost}>See the token scanner it grew from →</Link>
        <Link href="/security" className={styles.ctaGhost}>Our security posture ↗</Link>
      </div>
    </main>
  );
}
