import type { Metadata } from "next";
import { shareMeta } from "@/lib/share-meta";
import Link from "next/link";
import { OFFICIAL } from "@/lib/official";
import { getStats } from "@/lib/stats";
import { getRevenue } from "@/lib/revenue";
import { deployerStatus, deployerCopy, DEPLOYER_EVENTS } from "@/lib/deployer-status";
import styles from "./deck.module.css";

// Grant/partner deck. Linked from funding applications only: kept out of nav,
// sitemap and search. Every number here must stay verifiable (see /proof, /api/stats).
export const metadata: Metadata = shareMeta({
  title: "Grant Deck — GL1TCH",
  description:
    "GL1TCH grant deck: a free, open-source (MIT) token safety scanner for Solana. Problem, product, architecture, honest traction, roadmap, itemized use of funds and token disclosure.",
  alternates: { canonical: "/deck" },
  robots: { index: false, follow: false },
});

// Live numbers (scan counter split, deployer balance, revenue ledger) refresh hourly.
export const revalidate = 3600;

const product = [
  {
    title: "Scanner",
    text: "Paste any token address or search by name. Returns a 0–100 score and a verdict (CLEAN → RUG-SHAPED) with a plain-language reason for every check.",
  },
  {
    title: "Rug Radar (Sweeps + Live SSE)",
    text: "Sweeps freshly promoted tokens every 30 minutes and streams real-time Solana pool creations (Pump.fun, Raydium) via RPC logsSubscribe so flagged launches are visible before people buy.",
  },
  {
    title: "Yield X-Ray (multi-chain)",
    text: "Direct smart-contract reading of yields, real-yield vs emissions breakdown, reserve health and impermanent loss across 7 chains (Solana, Ethereum, Base, Tron, Arbitrum, BSC, Robinhood Chain).",
  },
  {
    title: "Public API + badge",
    text: "Free JSON API (no key, no token) and an embeddable “Scanned by GL1TCH” badge that auto-updates, so wallets, launchpads and communities can show a live risk check.",
  },
  {
    title: "Telegram bot + Watchtower",
    text: "Scan from chat, and get alerted when a watched token’s risk changes or a watched wallet dumps 25%+ of a position. 25 tokens and 25 wallets per user, plus 100 automatic scans a day in any group, free for everyone.",
  },
  {
    title: "For AI agents: MCP + x402",
    text: "The same checks as tools for AI agents: a free 4-tool MCP server at /api/mcp (rate-limited per IP) and 9 pay-per-call endpoints in USDC through x402 (no signup). Listed in the official MCP Registry, Coinbase x402 Bazaar and the PayAI catalog. Payments are public at /revenue; the free JSON API stays free.",
  },
];

const checks = [
  "Mint and freeze authority (can supply be printed or wallets frozen?)",
  "Token-2022 extensions, including hidden transfer fees",
  "Liquidity depth, fabricated depth, and LP lock / burn status",
  "Top-holder concentration and bundled, sniper or insider wallets",
  "Deployer track record across every token we have scanned",
  "Deployer holdings: how much of the supply the launching wallet holds right now (dump risk, or exited)",
  "Market integrity: bot-driven volume and holder counts inflated by linked wallets, which cap a token at CAUTION",
  "RugCheck as an independent second source; GoPlus for 15 EVM chains (honeypot, sell tax, mintable, ownership, pausable)",
  "Verdict anchoring: Rug Radar sweeps are Merkle-hashed and sealed on Solana (SPL Memo) for zero-trust browser verification",
];

type Item = { what: string; amount: string; detail?: string[] };

const funding: { track: string; items: Item[] }[] = [
  {
    track: "Core (open-source engine and hosting, not yet funded) · $10,000",
    items: [
      {
        what: "M1 · Keep the free API and Telegram bot hosted for 12 months, with a public status page",
        amount: "$3,000",
        detail: [
          "Private Solana RPC, Helius Developer: $49/mo × 12 ≈ $590",
          "Site + public API, Vercel Pro (Hobby is non-commercial only): $20/mo × 12 = $240",
          "Bot VM, Oracle Cloud Always Free: $0 today (moved off Railway in October 2026); ≈ $180 kept for a paid fallback VM if Oracle reclaims the free one",
          "Domain, mail forwarding, uptime monitoring: ≈ $90",
          "Reliability engineering, ≈ $1,900: status page and alerts, bot health checks, API abuse protection, daily backups of the bot's data, a load test at Rug Radar volume",
        ],
      },
      {
        what: "M2 · Publish the Solana check engine as a standalone open-source npm package (MIT) with docs, tests and examples",
        amount: "$4,000",
      },
      {
        what: "M3 · Claude-written plain-language explanations on every scan (explaining only data the scanner verified), plus public API docs",
        amount: "$3,000",
      },
    ],
  },
  {
    track: "Mobile (Solana Mobile proposal) · $12,000",
    items: [
      {
        what: "M1 · Android MVP (React Native / Expo): scan by paste, QR or the Android share sheet (share a token link from any app → instant verdict); publish to the Solana dApp Store",
        amount: "$4,000",
      },
      {
        what: "M2 · Solana Mobile Stack: connect a wallet with Mobile Wallet Adapter (read-only) and risk-check every token you hold in one tap; Sign In With Solana through MWA, so on Seeker ownership is proven by a message signed with the Seed Vault-backed wallet (never a transaction); Watchtower push alerts for your own holdings",
        amount: "$4,000",
      },
      {
        what: "M3 · Seeker polish, offline verdict cache, open-source the app (MIT), and mobile API/RPC capacity for 12 months",
        amount: "$4,000",
      },
    ],
  },
];

const fmtDate = (ms: number) => new Date(ms).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

export default async function DeckPage() {
  const [stats, dep, rev] = await Promise.all([getStats(), deployerStatus(), getRevenue()]);
  const deployer = deployerCopy(dep);

  return (
    <section className={styles.wrap}>
      <article className={`${styles.slide} ${styles.cover}`}>
        <span className="t-eyebrow">Grant deck · October 2026</span>
        <h1 className="t-h2">GL1TCH: scan before you buy</h1>
        <p className={styles.lead}>
          A free, open-source (MIT) token safety scanner for Solana, plus 15 EVM chains. Paste
          any token and get a risk score with plain-language reasons in seconds. Read-only: it
          never asks for a signature to scan, and no feature that protects people is ever gated
          behind a token.
        </p>
        <div className={styles.links}>
          <a className={styles.link} href={`${OFFICIAL.SITE_URL}/scan`}>Live scanner</a>
          <a className={styles.link} href={OFFICIAL.GITHUB_URL}>Source code (MIT)</a>
          <a className={styles.link} href={`${OFFICIAL.SITE_URL}/proof`}>Proof page</a>
          <a className={styles.link} href={`${OFFICIAL.SITE_URL}/llms.txt`}>API reference</a>
        </div>
      </article>

      <article className={styles.slide}>
        <span className={styles.num}>01 · Problem</span>
        <p className={styles.stat}>98.6%</p>
        <p className={styles.body}>
          of tokens launched on Pump.fun collapsed into pump-and-dump schemes shortly after
          launch, across 7M+ tokens analysed from January 2024 to March 2025.
        </p>
        <p className={styles.source}>Source: Solidus Labs, 2025 Rug Pull Report (May 2025).</p>
        <p className={styles.body}>
          Retail buyers see a ticker and a chart. The red flags (a live mint authority, a
          freeze authority, a hidden Token-2022 transfer fee, unlocked liquidity, bundled
          sniper wallets, a deployer with a history of rugs or a dump-sized bag) sit in on-chain
          state they can&apos;t read. Many checkers show raw flags with little explanation, and
          some keep the deeper data behind a paywall.
        </p>
      </article>

      <article className={styles.slide}>
        <span className={styles.num}>02 · Product (live today)</span>
        <div className={styles.grid}>
          {product.map((p) => (
            <div key={p.title} className={styles.card}>
              <span className={styles.cardTitle}>{p.title}</span>
              <span className={styles.cardText}>{p.text}</span>
            </div>
          ))}
        </div>
      </article>

      <article className={styles.slide}>
        <span className={styles.num}>03 · What every Solana scan checks</span>
        <ul className={styles.list}>
          {checks.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
        <p className={styles.source}>
          Weights and thresholds are public, and every change is logged in docs/scoring-changelog.md.
        </p>
      </article>

      <article className={styles.slide}>
        <span className={styles.num}>04 · Why it&apos;s different</span>
        <ul className={styles.list}>
          <li><strong>Free, no paywall, no token gate.</strong> The full scan, API, badge, Rug Radar and Watchtower cost nothing and never require holding anything.</li>
          <li><strong>Explains, not just flags.</strong> Several sources become one verdict with a reason per check.</li>
          <li><strong>Remembers deployers.</strong> Every scan feeds a deployer history, so a serial rugger&apos;s next token is flagged.</li>
          <li><strong>Built to be reused.</strong> Public API and badge let any wallet, launchpad or community embed a risk check.</li>
          <li><strong>Non-custodial and open source.</strong> Scanning is read-only; the optional swap is signed only in the user&apos;s own wallet. MIT-licensed code.</li>
        </ul>
      </article>

      <article className={styles.slide}>
        <span className={styles.num}>05 · Traction (honest numbers)</span>
        <ul className={styles.list}>
          <li>Scanner live since late June 2026, built and run by one person at no cost to users, with no paid marketing.</li>
          <li>
            The public counter (live since 4 July 2026) shows{" "}
            <strong>{stats ? stats.scanned.toLocaleString("en-US") : "—"} scans counted</strong> in
            total. That total includes automated scans (Rug Radar sweeps every 30 minutes, Watchtower
            re-scans), so it overstates people&apos;s usage by a wide margin. The ~1,950 we quoted for mid-July
            included those sweeps too.
          </li>
          <li>
            From 20 October 2026 the counter records people&apos;s scans and automated scans
            separately and publishes both at <code>/api/stats</code>. At first our own pages&apos; live
            self-checks of $GL1TCH, link previews and badge renders were still counted as people&apos;s scans,
            so we fixed that and restarted the split
            {stats?.splitSince ? (
              <>
                {" "}on {fmtDate(stats.splitSince)}: since then, <strong>{stats.user.toLocaleString("en-US")} user scans</strong> and{" "}
                {stats.auto.toLocaleString("en-US")} automated.
              </>
            ) : (
              "."
            )}
          </li>
          {rev && (
            <li>
              <strong>AI-agent adoption (x402 + MCP, live since 28 October 2026):</strong>{" "}
              <strong>{rev.paid.count.toLocaleString("en-US")} settled external paid calls</strong> in USDC on Solana and Base
              {rev.quotes ? ` alongside ${rev.quotes.last30.total.toLocaleString("en-US")} price quotes` : ""}, with every on-chain
              transaction published at <Link className={styles.link} href="/revenue">/revenue</Link> (our own test calls are listed
              separately and excluded from totals). Ranked in the top 5 on the Coinbase x402 Bazaar for{" "}
              <em>agent wallet trust</em> (#2), <em>solana yield</em> (#2), <em>deployer reputation</em> (#3) and{" "}
              <em>verifiable random number</em> (#5).
            </li>
          )}
          <li>The bot&apos;s hosting lapsed from late July to 17 October 2026, so there is no reliable figure for that period.</li>
          <li>Solana natively, plus 15 EVM chains through GoPlus (Ethereum, Base, BNB Chain, Arbitrum, Polygon and more), and on-chain yield metrics across 7 ecosystems.</li>
        </ul>
      </article>

      <article className={styles.slide}>
        <span className={styles.num}>06 · Architecture and engineering</span>
        <div className={styles.grid}>
          <div className={styles.card}>
            <span className={styles.cardTitle}>Scanner + public API</span>
            <span className={styles.cardText}>
              Next.js on Vercel. Each scan reads Solana RPC directly (mint, authorities, holders,
              the deployer&apos;s live balance) and cross-checks RugCheck, DexScreener /
              GeckoTerminal and, for EVM, GoPlus. Every source is fault-tolerant: a slow one
              degrades to &quot;unknown&quot; and lowers the confidence score instead of failing.
            </span>
          </div>
          <div className={styles.card}>
            <span className={styles.cardTitle}>Bot + Signal Graph</span>
            <span className={styles.cardText}>
              TypeScript Telegram bot on an Oracle Cloud VM with atomic temp+rename on-disk state and daily snapshots:
              the deployer reputation graph, Watchtower sweeps, real-time RPC pool listener and the public counters.
            </span>
          </div>
          <div className={styles.card}>
            <span className={styles.cardTitle}>Quality gates</span>
            <span className={styles.cardText}>
              TypeScript for the scanner, API and bot, and more than 680 automated unit tests (323 on the site
              and 358 on the bot), run in CI on every push alongside type checks.
            </span>
          </div>
          <div className={styles.card}>
            <span className={styles.cardTitle}>Security</span>
            <span className={styles.cardText}>
              CI runs a secret scan, a dependency audit and a check that our code never signs for users or requests a token approval. The only transaction is the optional swap, which the user starts and signs in their own wallet. Public threat model, risk register and
              SECURITY.md disclosure policy.
            </span>
          </div>
        </div>
      </article>

      <article className={styles.slide}>
        <span className={styles.num}>07 · Roadmap and use of funds</span>
        <p className={styles.body}>
          Each milestone is funded once. If one program funds a milestone, it is removed from
          every other request.
        </p>
        {funding.map((f) => (
          <table key={f.track} className={styles.table}>
            <thead>
              <tr>
                <th>{f.track}</th>
                <th>Budget</th>
              </tr>
            </thead>
            <tbody>
              {f.items.map((it) => (
                <tr key={it.what}>
                  <td>
                    {it.what}
                    {it.detail && (
                      <ul className={styles.breakdown}>
                        {it.detail.map((d) => (
                          <li key={d}>{d}</li>
                        ))}
                      </ul>
                    )}
                  </td>
                  <td className={styles.amount}>{it.amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ))}
        <p className={styles.source}>
          Infrastructure lines are estimates at public list prices (October 2026).
        </p>
        <p className={styles.body}>
          Why mobile: most Solana trading starts from a link on a phone. On Seeker, the scan
          sits one share-tap away from the moment someone is about to buy, and the app never
          requests a transaction signature.
        </p>
        <p className={styles.body}>
          <strong>Already built:</strong> a working Android prototype (Expo / React Native, MIT), tested end
          to end on a real Android phone with Phantom. Share a Pump.fun link from any app and it scans on
          arrival; connect a wallet over Mobile Wallet Adapter (read-only) and it risk-checks every token
          you hold; Sign in with Solana proves ownership with a signed message, never a transaction. The
          mobile milestones above turn it into a polished dApp Store release with Watchtower alerts.{" "}
          <a className={styles.link} href="https://youtu.be/HubNomvZ7_k">Demo video</a> ·{" "}
          <a className={styles.link} href={`${OFFICIAL.GITHUB_URL}/tree/main/mobile`}>Source</a>
        </p>
      </article>

      <article className={styles.slide}>
        <span className={styles.num}>08 · How it stays free</span>
        <ul className={styles.list}>
          <li>Running costs are small and itemized above: about $1,100 a year of infrastructure at list prices.</li>
          <li>Grants cover the first 12 months and the open-source work.</li>
          <li>
            After that, pay-per-call AI-agent endpoints over x402 (9 routes in USDC on Solana and Base, live today
            at <Link className={styles.link} href="/revenue">/revenue</Link>) and B2B services on top of the free
            tools carry the hosting. The public scanner, JSON API, MCP server, Watchtower and badge stay 100% free.
          </li>
          <li>
            An optional scan-gated swap through Jupiter is also live. A GL1TCH fee of 0.5% applies only when the swap
            screen shows it, before signing, and plays no part in a token&apos;s score. It is never required to use the scanner.
          </li>
        </ul>
      </article>

      <article className={styles.slide}>
        <span className={styles.num}>09 · Token disclosure</span>
        <p className={styles.body}>
          The project also launched a community token, $GL1TCH, on Pump.fun on 29 May 2026
          (Token-2022, mint and freeze authority revoked, 0% tax, liquidity in the Pump.fun bonding curve). The deployer
          wallet sold its full position on{" "}
          <a className={styles.link} href={DEPLOYER_EVENTS.exit.tx}>{DEPLOYER_EVENTS.exit.date}</a> and{" "}
          <a className={styles.link} href={DEPLOYER_EVENTS.buyback.firstTx}>bought back on {DEPLOYER_EVENTS.buyback.dates}</a>;
          it {deployer.now}. The token trades very thinly (a few thousand dollars of liquidity).
        </p>
        <p className={styles.body}>
          Holding the token unlocks only community ranks, the verifiable-randomness API and free use
          of the pay-per-call agent API; the same safety checks stay free for everyone at /api/scan.{" "}
          <strong>No grant funds go to the token, buybacks or liquidity.</strong> Receipts are on
          the <Link className={styles.link} href="/proof">proof page</Link>.
        </p>
      </article>

      <article className={styles.slide}>
        <span className={styles.num}>10 · Team and contact</span>
        <p className={styles.body}>
          Solo founder based in Turkey, who designed, built and operates the whole stack with AI
          coding agents: scanner, public API, badge, Rug Radar and the Telegram bot. There are no other team members.
        </p>
        <div className={styles.links}>
          <a className={styles.link} href="mailto:founder@gl1tchbased.xyz">founder@gl1tchbased.xyz</a>
          <a className={styles.link} href={OFFICIAL.SITE_URL}>gl1tchbased.xyz</a>
          <a className={styles.link} href={OFFICIAL.X_URL}>X</a>
          <a className={styles.link} href={OFFICIAL.TG_URL}>Telegram</a>
          <a className={styles.link} href={OFFICIAL.GITHUB_URL}>GitHub</a>
        </div>
      </article>
    </section>
  );
}
