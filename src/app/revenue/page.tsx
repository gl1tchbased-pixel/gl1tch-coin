import type { Metadata } from "next";
import Link from "next/link";
import { shareMeta } from "@/lib/share-meta";
import { getRevenue, type RevenueEntry } from "@/lib/revenue";
import { getTreasurySnapshot } from "@/lib/treasury-revenue";
import { PAID_ROUTES, readPayTo, type PaidRouteId } from "@/lib/x402/config";
import { DEPLOYER_WALLET } from "@/lib/official";
import { RevenueAutoRefresher } from "@/components/web3/RevenueAutoRefresher";
import styles from "../buyback/buyback.module.css";

export const metadata: Metadata = shareMeta({
  title: "Revenue & Treasury — GL1TCH",
  description:
    "GL1TCH's public revenue ledger and live on-chain treasury. AI agents pay per call in USDC through x402, Safe Swap takes a disclosed 0.5% fee, and balances are read straight from Solana and Base.",
  alternates: { canonical: "/revenue" },
});

export const revalidate = 60;

const usd = (micro: number) =>
  `$${(micro / 1e6).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 3 })}`;

const networkName = (n: string) => (n.startsWith("solana:") ? "Solana" : n === "eip155:8453" ? "Base" : n);

function txUrl(e: RevenueEntry): string | null {
  if (e.network.startsWith("solana:")) return `https://solscan.io/tx/${e.tx}`;
  if (e.network === "eip155:8453") return `https://basescan.org/tx/${e.tx}`;
  return null;
}

const when = (ms: number) => new Date(ms).toISOString().slice(0, 16).replace("T", " ") + " UTC";
const shortAddr = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
/** A failed chain read shows no number rather than a wrong one. */
const shown = (v: number | null, format: (n: number) => string) => (v === null ? "—" : format(v));
const solAmount = (digits: number) => (n: number) => `${n.toFixed(digits)} SOL`;
const usdc = (digits: number) => (n: number) => `$${n.toFixed(digits)}`;

export default async function RevenuePage() {
  const [rev, treasury] = await Promise.all([getRevenue(), getTreasurySnapshot()]);
  const routes = Object.keys(PAID_ROUTES) as PaidRouteId[];
  // Grant reviewers ask where income lands: say it plainly when it is the disclosed deployer wallet.
  const paysDeployer = readPayTo(process.env).solana === DEPLOYER_WALLET;

  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
          <span className={styles.eyebrow}>Paid agent API · Safe Swap fee · Creator fees · On-chain receipts</span>
          <RevenueAutoRefresher />
        </div>
        <h1 className={styles.title}>
          Revenue. Every dollar, <span className={styles.signal}>on-chain</span>.
        </h1>
        <p className={styles.lede}>
          AI agents pay GL1TCH per call in USDC through x402: no signup, no invoice. Each payment settles
          on-chain straight to a GL1TCH wallet and is recorded here with its transaction (the latest 50 are
          listed), alongside live Solana and Base treasury balances and claimed protocol creator rewards.
          Our own test payments are listed too, marked, and never counted.
        </p>
        <p className={styles.lede}>
          Safe Swap takes a 0.5% fee on swaps where the swap screen shows it, before you sign. Jupiter keeps 20%
          of that fee. The rest collects in a public vault owned by a separate wallet ({shortAddr(treasury.feeVaultOwner)})
          whose key is on none of our servers.
        </p>
        {paysDeployer && (
          <p className={styles.lede}>
            Solana payments and creator fee claims land in the disclosed deployer treasury ({DEPLOYER_WALLET.slice(0, 4)}…{DEPLOYER_WALLET.slice(-4)}),
            the same wallet whose $GL1TCH balance and history are on the{" "}
            <Link href="/proof">proof page</Link>.
          </p>
        )}
        <div style={{ marginTop: "1.25rem", display: "flex", gap: "0.75rem", flexWrap: "wrap", justifyContent: "center" }}>
          <Link
            href="/blinks"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 16px",
              borderRadius: "8px",
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              color: "#e2e8f0",
              fontSize: "0.85rem",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            🛡️ Safe Swap Blinks →
          </Link>
        </div>
      </header>

      <section className={styles.totals}>
        <div className={styles.stat}>
          <span className={styles.statV}>{shown(treasury.totalUsdc, usdc(2))}</span>
          <span className={styles.statK}>treasury USDC (Solana + Base)</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statV}>{shown(treasury.solanaSol, solAmount(4))}</span>
          <span className={styles.statK}>treasury SOL balance</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statV}>{shown(treasury.feeVaultSol, solAmount(4))}</span>
          <span className={styles.statK}>Safe Swap fees in the vault</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statV}>+{treasury.creatorClaimedSol.toFixed(4)} SOL</span>
          <span className={styles.statK}>creator rewards claimed</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statV}>
            {rev ? `${rev.paid.count.toLocaleString("en-US")} (${usd(rev.paid.usdMicro)})` : "—"}
          </span>
          <span className={styles.statK}>external paid x402 calls</span>
        </div>
      </section>

      <section className={styles.how}>
        <span className={styles.kicker}>Live on-chain treasury &amp; creator rewards</span>
        <p className={styles.note}>
          Read directly from Solana Mainnet and Base Mainnet RPCs. Every wallet and claim transaction links
          to its block explorer so anyone can verify the exact lamports and USDC balances independently.
          These are what the wallets hold right now, not lifetime earnings: money moved or claimed out leaves
          these numbers. Earnings are in the ledger below.
        </p>
        <div className={styles.ledger}>
          <div className={`${styles.row} ${styles.head}`}>
            <span>Source / Wallet</span><span>Network</span><span>Live Balance / Claimed</span><span>Explorer</span>
          </div>
          <div className={styles.row}>
            <span>Deployer Treasury ({shortAddr(treasury.solanaWallet)})</span>
            <span>Solana</span>
            <span>{shown(treasury.solanaSol, solAmount(6))} · {shown(treasury.solanaUsdc, usdc(3))} USDC</span>
            <span className={styles.proof}>
              <a href={`https://solscan.io/account/${treasury.solanaWallet}`} target="_blank" rel="noreferrer">Solscan ↗</a>
            </span>
          </div>
          <div className={styles.row}>
            <span>x402 Base Treasury ({shortAddr(treasury.baseWallet)})</span>
            <span>Base</span>
            <span>{shown(treasury.baseUsdc, usdc(3))} USDC</span>
            <span className={styles.proof}>
              <a href={`https://basescan.org/address/${treasury.baseWallet}`} target="_blank" rel="noreferrer">Basescan ↗</a>
            </span>
          </div>
          <div className={styles.row}>
            <span>Safe Swap Fee Vault ({shortAddr(treasury.feeVault)})</span>
            <span>Solana</span>
            <span>{shown(treasury.feeVaultSol, solAmount(6))} unclaimed, before Jupiter&apos;s 20%</span>
            <span className={styles.proof}>
              <a href={`https://solscan.io/account/${treasury.feeVault}`} target="_blank" rel="noreferrer">Vault ↗</a>
            </span>
          </div>
          <div className={styles.row}>
            <span>Pump.fun Creator Vault PDA ({shortAddr(treasury.creatorVaultPda)})</span>
            <span>Solana</span>
            <span>{shown(treasury.creatorVaultClaimableSol, solAmount(6))} claimable ({shown(treasury.creatorVaultRawSol, solAmount(6))} raw)</span>
            <span className={styles.proof}>
              <a href={`https://solscan.io/account/${treasury.creatorVaultPda}`} target="_blank" rel="noreferrer">Vault ↗</a>
            </span>
          </div>
          {treasury.creatorClaims.map((c) => (
            <div key={c.tx} className={styles.row}>
              <span>Creator Fee Claim ({when(c.at)})</span>
              <span>Solana</span>
              <span>+{c.amountSol.toFixed(6)} SOL ({c.lamports.toLocaleString("en-US")} lamports)</span>
              <span className={styles.proof}>
                <a href={`https://solscan.io/tx/${c.tx}`} target="_blank" rel="noreferrer">tx ↗</a>
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.how}>
        <span className={styles.kicker}>Active revenue &amp; holder-demand channels</span>
        <div className={styles.ledger}>
          <div className={`${styles.row} ${styles.head}`}>
            <span>Channel</span><span>Status</span><span>Pricing / Holder Model</span><span>Link</span>
          </div>
          {treasury.channels.map((ch) => (
            <div key={ch.id} className={styles.row}>
              <span>{ch.name}</span>
              <span>{ch.status.toUpperCase()}</span>
              <span>{ch.model}</span>
              <span className={styles.proof}>
                {ch.verifyHref.startsWith("http") ? (
                  <a href={ch.verifyHref} target="_blank" rel="noreferrer">Open ↗</a>
                ) : (
                  <Link href={ch.verifyHref}>Open →</Link>
                )}
              </span>
            </div>
          ))}
        </div>
      </section>

      {!rev ? (
        <section className={styles.empty}>
          <span className={styles.emptyTag}>ledger unreachable</span>
          <h2 className={styles.emptyH}>The x402 call ledger can&apos;t be reached right now.</h2>
          <p className={styles.emptyP}>
            The x402 call ledger lives on the GL1TCH bot server and didn&apos;t answer. This section shows no
            number rather than a wrong one. Try again in a minute.
          </p>
        </section>
      ) : rev.paid.count === 0 ? (
        <section className={styles.empty}>
          <span className={styles.emptyTag}>live · no paid calls yet</span>
          <h2 className={styles.emptyH}>No paid calls yet.</h2>
          <p className={styles.emptyP}>
            The paid API is live, and this ledger starts at zero: nothing has been earned, so nothing is
            shown. The first real payment will appear here with its transaction.
          </p>
        </section>
      ) : (
        <>
          <section className={styles.how}>
            <span className={styles.kicker}>x402 Paid Agent API · by endpoint</span>
            <p className={styles.note}>
              {rev.paid.count.toLocaleString("en-US")} external paid calls ({usd(rev.paid.usdMicro)} USDC) since{" "}
              {rev.since ? new Date(rev.since).toISOString().slice(0, 10) : "launch"}, plus{" "}
              {rev.self.count.toLocaleString("en-US")} self-test settlements ({usd(rev.self.usdMicro)} USDC, excluded from revenue totals).
            </p>
            <div className={styles.ledger}>
              <div className={`${styles.row} ${styles.head}`}>
                <span>Endpoint</span><span>Price</span><span>Calls</span><span>Earned</span>
              </div>
              {routes.map((id) => (
                <div key={id} className={styles.row}>
                  <span>{PAID_ROUTES[id].path}</span>
                  <span>{PAID_ROUTES[id].price}</span>
                  <span>{(rev.byRoute[id]?.count ?? 0).toLocaleString("en-US")}</span>
                  <span>{usd(rev.byRoute[id]?.usdMicro ?? 0)}</span>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      {rev?.quotes && (
        <section className={styles.how}>
          <span className={styles.kicker}>Price quotes · last 30 days</span>
          <p className={styles.note}>
            {rev.quotes.last30.total.toLocaleString("en-US")} unpaid <code>402</code> answers, next to{" "}
            {rev.paid.count.toLocaleString("en-US")} paid calls. Most quotes come from catalog crawlers and uptime
            monitors checking the price, so a quote is not a sale; the gap between the two is the honest measure.
          </p>
          <div className={styles.ledger}>
            <div className={`${styles.row} ${styles.head}`}>
              <span>Endpoint</span><span>Price</span><span>Quotes</span><span>Paid</span>
            </div>
            {routes.map((id) => (
              <div key={id} className={styles.row}>
                <span>{PAID_ROUTES[id].path}</span>
                <span>{PAID_ROUTES[id].price}</span>
                <span>{(rev.quotes?.last30.byRoute[id] ?? 0).toLocaleString("en-US")}</span>
                <span>{(rev.byRoute[id]?.count ?? 0).toLocaleString("en-US")}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {rev && rev.recent.length > 0 && (
        <section className={styles.how}>
          <span className={styles.kicker}>Latest x402 payments</span>
          <div className={styles.ledger}>
            <div className={`${styles.row} ${styles.head}`}>
              <span>Time</span><span>Endpoint</span><span>Amount</span><span>Proof</span>
            </div>
            {rev.recent.map((e) => {
              const url = txUrl(e);
              return (
                <div key={`${e.network}:${e.tx}`} className={styles.row}>
                  <span>{when(e.at)}</span>
                  <span>{PAID_ROUTES[e.route]?.path ?? e.route}</span>
                  <span>
                    {usd(e.amountMicro)} · {networkName(e.network)}
                    {e.self && <> <span className={styles.emptyTag}>self-test · not counted</span></>}
                  </span>
                  <span className={styles.proof}>
                    {url ? <a href={url} target="_blank" rel="noreferrer">tx ↗</a> : <span>{e.tx.slice(0, 10)}…</span>}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className={styles.how}>
        <span className={styles.kicker}>How it works</span>
        <h2 className={styles.h2}>Agents pay per call. The scanner stays free.</h2>
        <ol className={styles.steps}>
          <li><strong>Ask.</strong> An agent calls a paid endpoint and gets <code>402 Payment Required</code> with the price and a GL1TCH wallet.</li>
          <li><strong>Pay.</strong> It signs a USDC transfer (Solana or Base) and retries. Nobody holds its keys: the payment network broadcasts the agent&apos;s own signed transfer.</li>
          <li><strong>Settle only on success.</strong> The transfer settles only when the call succeeds. A failed or degraded read returns an error and costs nothing.</li>
          <li><strong>Publish.</strong> The settled transaction lands on this page.</li>
        </ol>
        <p className={styles.note}>
          The free scanner and its free API don&apos;t change. $GL1TCH holders with an API key call the paid
          endpoints free. If revenue holds for three months, the buyback ledger is where it would go next,
          and only on the founder&apos;s decision.
        </p>
        <div className={styles.cta}>
          <Link href="/agents/docs#x402" className={styles.btnPrimary}>API docs →</Link>
          <Link href="/buyback" className={styles.btnGhost}>Buyback ledger</Link>
          <a href="/revenue.json" className={styles.btnGhost}>Ledger as JSON</a>
          <Link href="/scan" className={styles.btnGhost}>Free scanner</Link>
        </div>
      </section>
    </main>
  );
}
