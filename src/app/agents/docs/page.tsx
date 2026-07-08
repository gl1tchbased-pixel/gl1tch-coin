import type { Metadata } from "next";
import Link from "next/link";
import styles from "../agents.module.css";

export const metadata: Metadata = {
  title: "Agent Trust API — Developer Docs — GL1TCH KYA",
  description:
    "Integrate GL1TCH Know Your Agent in minutes. Check any on-chain agent's trust, embed a live badge, or let your agent self-register — free, one call. curl / JS / Python examples.",
  alternates: { canonical: "/agents/docs" },
};

const BASE = "https://coin-three-mu.vercel.app";

function Code({ head, children }: { head: string; children: string }) {
  return (
    <div className={styles.code}>
      <div className={styles.codeHead}>{head}</div>
      <pre>{children}</pre>
    </div>
  );
}

export default function AgentDocsPage() {
  return (
    <main className="container" style={{ paddingBlock: "var(--space-16)", maxWidth: 860 }}>
      <div style={{ marginBottom: "var(--space-8)" }}>
        <span className="t-eyebrow">Agent Trust API · Developer Docs</span>
        <h1 className="t-h1" style={{ marginTop: "var(--space-3)" }}>Integrate <span className={styles.accent}>Know Your Agent</span> in minutes.</h1>
        <p className="t-body-lg" style={{ color: "var(--text-secondary)", maxWidth: 680, margin: "var(--space-4) auto 0" }}>
          One free call tells you whether an on-chain agent is safe to trust. No key, no auth, no
          SDK required. Base URL: <code>{BASE}</code>
        </p>
      </div>

      <section className={styles.block}>
        <h2 className={styles.h2}>1 · Check an agent&apos;s trust</h2>
        <p className={styles.cardD} style={{ marginBottom: "var(--space-3)" }}>
          <code>GET /api/agent/check?address=&lt;wallet&gt;&amp;chain=solana</code> — returns a KYA
          verdict. Use it as a guardrail before you let an agent transact.
        </p>
        <Code head="curl">{`curl "${BASE}/api/agent/check?address=<wallet>&chain=solana"`}</Code>
        <Code head="JavaScript — guardrail before an agent acts">{`const r = await fetch(
  \`${BASE}/api/agent/check?address=\${agentWallet}&chain=solana\`
);
const trust = await r.json();
// { level: "trusted"|"neutral"|"caution"|"unknown", score, reasons[], verified }
if (trust.level === "caution") {
  throw new Error(\`Blocked: agent \${agentWallet} — \${trust.reasons[0]}\`);
}`}</Code>
        <Code head="Python">{`import requests
t = requests.get("${BASE}/api/agent/check",
    params={"address": wallet, "chain": "solana"}).json()
if t["level"] == "caution":
    raise RuntimeError(f"Blocked agent: {t['reasons'][0]}")`}</Code>
        <Code head="Response">{`{
  "address": "<wallet>",
  "chain": "solana",
  "score": 62,                 // 0-100
  "level": "neutral",          // trusted | neutral | caution | unknown
  "reasons": ["Identity verified — …", "…"],
  "verified": true,            // proved wallet ownership
  "registered": true
}`}</Code>
      </section>

      <section className={styles.block}>
        <h2 className={styles.h2}>2 · Embed a live trust badge</h2>
        <p className={styles.cardD} style={{ marginBottom: "var(--space-3)" }}>
          A self-updating SVG that links to the agent&apos;s permanent KYA profile. Drop it in a
          README, dashboard, or agent card.
        </p>
        <Code head="HTML / Markdown">{`<a href="${BASE}/agents/solana-<wallet>">
  <img src="${BASE}/api/agent/badge?address=<wallet>&chain=solana"
       alt="GL1TCH Agent Trust" width="360" height="84" />
</a>`}</Code>
      </section>

      <section className={styles.block}>
        <h2 className={styles.h2}>3 · Let your agent self-register</h2>
        <p className={styles.cardD} style={{ marginBottom: "var(--space-3)" }}>
          Agents are programmatic — yours proves ownership by signing a message with its own
          keypair (moves no funds, grants no access). Verified identity raises its trust.
        </p>
        <Code head="JavaScript (ed25519 / Solana)">{`import nacl from "tweetnacl";
import bs58 from "bs58";

const issued = Date.now();
const msg = \`GL1TCH Agent Registration
Wallet: \${address}
Issued: \${issued}
This proves wallet ownership. It moves no funds and grants no access.\`;
const signature = bs58.encode(
  nacl.sign.detached(new TextEncoder().encode(msg), secretKey)
);

await fetch("${BASE}/api/agent/register", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ address, chain: "solana", issued, signature }),
}); // → { ok: true }`}</Code>
      </section>

      <section className={styles.block}>
        <h2 className={styles.h2}>4 · ERC-8004 (Trustless Agents) compatible</h2>
        <p className={styles.cardD} style={{ marginBottom: "var(--space-3)" }}>
          <a href="https://eips.ethereum.org/EIPS/eip-8004" target="_blank" rel="noreferrer">ERC-8004</a> is
          the emerging open standard for agent identity + reputation (MetaMask, Ethereum Foundation,
          Google, Coinbase). GL1TCH emits an ERC-8004-<em>compatible</em> Agent Registration File, with
          our trust score mapped into the standard&apos;s Reputation-Registry feedback shape — so any
          framework that already speaks ERC-8004 can consume GL1TCH signals with zero custom glue.
        </p>
        <Code head="curl">{`curl "${BASE}/api/agent/erc8004?address=<wallet>&chain=solana"
# → { "type": ".../eip-8004#registration-v1", "supportedTrust": ["reputation"],
#     "reputation": { "value": <score>, "tag1": "<level>", "clientAddress": "GL1TCH" }, ... }`}</Code>
        <p className={styles.cardD} style={{ marginTop: "var(--space-3)" }}>
          GL1TCH is an <strong>off-chain</strong> signal provider — we don&apos;t deploy the on-chain
          Identity Registry (ERC-721); that stays the operator&apos;s choice. We give ERC-8004 consumers
          a portable, standard-shaped reputation feed.
        </p>
      </section>

      <section className={styles.block}>
        <h2 className={styles.h2}>Notes</h2>
        <ul className={styles.reasonList}>
          <li>Free. Rate-limited per IP (generous). Depth + bulk access will tie to holding $GL1TCH — usage becomes revenue.</li>
          <li>GL1TCH is a <strong>reputation &amp; provenance signal</strong>, not key custody. It never touches an agent&apos;s keys or yours.</li>
          <li>A verdict is a risk signal, not a guarantee — and never financial advice.</li>
          <li>AI agents: a machine-readable summary lives at <a href="/llms.txt">/llms.txt</a>.</li>
        </ul>
      </section>

      <div className={styles.cta}>
        <Link href="/agents" className={styles.ctaGhost}>← Know Your Agent</Link>
        <Link href="/agents/directory" className={styles.ctaGhost}>Agent directory →</Link>
      </div>
    </main>
  );
}
