import type { Metadata } from "next";
import Link from "next/link";
import { PAID_ROUTES, type PaidRouteId } from "@/lib/x402/config";
import styles from "../agents.module.css";

export const metadata: Metadata = {
  title: "Agent Trust API — Developer Docs — GL1TCH KYA",
  description:
    "Integrate GL1TCH Know Your Agent in minutes. Check any on-chain agent's trust, embed a live badge, or let your agent self-register — free, one call. curl / JS / Python examples.",
  alternates: { canonical: "/agents/docs" },
};

const BASE = "https://gl1tchbased.xyz";

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

      <section className={styles.block} id="x402">
        <h2 className={styles.h2}>5 · Pay per call (x402)</h2>
        <p className={styles.cardD} style={{ marginBottom: "var(--space-3)" }}>
          Agents that would rather pay than share a rate limit can call the same checks through{" "}
          <a href="https://www.x402.org" target="_blank" rel="noreferrer">x402</a>: no signup, no key,
          USDC on Solana or Base. The free endpoints above don&apos;t change.
        </p>
        <ul className={styles.reasonList}>
          {(Object.keys(PAID_ROUTES) as PaidRouteId[]).map((id) => (
            <li key={id}>
              <code>GET {PAID_ROUTES[id].path}</code> · <strong>{PAID_ROUTES[id].price}</strong> · {PAID_ROUTES[id].description}
            </li>
          ))}
        </ul>
        <Code head="flow">{`curl -i "${BASE}/api/x402/scan?mint=<token>&chain=solana"
# → 402 Payment Required + PAYMENT-REQUIRED header (price, network, payTo)
# Your x402 client signs a USDC transfer and retries with PAYMENT-SIGNATURE
# → 200 + the report + PAYMENT-RESPONSE header (the settled transaction)`}</Code>
        <Code head="JavaScript — pay from your agent's own Solana wallet (@x402/fetch)">{`import { x402Client, wrapFetchWithPayment } from "@x402/fetch";
import { registerExactSvmScheme } from "@x402/svm/exact/client";
import { toClientSvmSigner } from "@x402/svm";
import { createKeyPairSignerFromBytes } from "@solana/kit";

const signer = await createKeyPairSignerFromBytes(agentSecretKey); // 64-byte secret key
const client = registerExactSvmScheme(new x402Client(), {
  signer: toClientSvmSigner(signer),
  networks: ["solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp"],
});
const pay = wrapFetchWithPayment(fetch, client);

const res = await pay("${BASE}/api/x402/quick?mint=<token>&chain=solana");
const check = await res.json(); // { verdict, score, flags[], liquidityUsd, … }`}</Code>
        <Code head="Coinbase agentic wallet (awal) — Base USDC, with a spending cap">{`npx awal@2.12.1 x402 pay "${BASE}/api/x402/quick?mint=<token>" --max-amount 1000 --json
# --max-amount is in USDC atomic units: 1000 = $0.001`}</Code>
        <Code head="Poll Rug Radar for new launches only">{`# First call: the whole sweep plus a cursor
GET ${BASE}/api/x402/radar            → { cursor: 1793217500000, tokens: [...] }
# Every next call: only tokens listed after the last cursor
GET ${BASE}/api/x402/radar?since=1793217500000`}</Code>
        <Code head="Agent skill (Claude Code, Codex, OpenClaw, …)">{`npx skills add gl1tchbased-pixel/gl1tch-coin --skill gl1tch-token-safety`}</Code>
        <ul className={styles.reasonList} style={{ marginTop: "var(--space-3)" }}>
          <li>You pay only for a successful response. A failed or degraded read (sources down) returns an error and settles nothing.</li>
          <li>Paid responses are never served from a CDN cache.</li>
          <li>$GL1TCH holders: send your <code>x-gl1tch-key</code> header and the paid endpoints are free at your tier&apos;s rate.</li>
          <li>Settled payments are recorded with their transaction on the public <Link href="/revenue">revenue ledger</Link> (latest 50 listed).</li>
          <li>
            <code>/api/x402/random</code> commits to a drand quicknet round that is still in the future, so nobody can know the
            numbers when you ask. To check a result: <code>randomness = sha256(signature)</code>, the signature is the drand
            quicknet BLS signature over <code>sha256(uint64_be(round))</code>, <code>requestId = sha256(commitment)</code>, and the
            values come from{" "}
            <a href="https://github.com/gl1tchbased-pixel/gl1tch-coin/blob/main/src/lib/quantum/random.ts" target="_blank" rel="noreferrer">deriveResult</a>
            {" "}(the same derivation as the holder Randomness API).
          </li>
        </ul>
      </section>

      <section className={styles.block} id="mcp">
        <h2 className={styles.h2}>6 · Use it from Claude, Cursor or any MCP client</h2>
        <p className={styles.cardD} style={{ marginBottom: "var(--space-3)" }}>
          GL1TCH is also an MCP server, so an assistant can check a token before you trade it. Free, 60 requests a
          minute per IP. Tools: <code>scan_token</code>, <code>check_agent_wallet</code>, <code>deployer_reputation</code>.
        </p>
        <Code head="MCP client config (Streamable HTTP)">{`{
  "mcpServers": {
    "gl1tch": { "url": "${BASE}/api/mcp" }
  }
}
// stdio-only clients: "command": "npx", "args": ["-y", "mcp-remote", "${BASE}/api/mcp"]`}</Code>
      </section>

      <section className={styles.block}>
        <h2 className={styles.h2}>Notes</h2>
        <ul className={styles.reasonList}>
          <li>Free, no key and no token needed. Rate-limited per IP; integrators who need more can ask at founder@gl1tchbased.xyz, or pay per call (section 5).</li>
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
