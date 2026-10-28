import type { Metadata } from "next";
import Link from "next/link";
import { shareMeta } from "@/lib/share-meta";
import { getRevenue, type RevenueEntry } from "@/lib/revenue";
import { PAID_ROUTES, type PaidRouteId } from "@/lib/x402/config";
import styles from "../buyback/buyback.module.css";

export const metadata: Metadata = shareMeta({
  title: "Revenue — GL1TCH",
  description:
    "GL1TCH's public revenue ledger. AI agents pay per call in USDC through x402; settled payments are recorded with their on-chain transaction. Our own test payments are shown but never counted.",
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

export default async function RevenuePage() {
  const rev = await getRevenue();
  const routes = Object.keys(PAID_ROUTES) as PaidRouteId[];

  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <span className={styles.eyebrow}>Paid agent API · on-chain receipts</span>
        <h1 className={styles.title}>
          Revenue. Every dollar, <span className={styles.signal}>on-chain</span>.
        </h1>
        <p className={styles.lede}>
          AI agents pay GL1TCH per call in USDC through x402: no signup, no invoice. Each payment settles
          on-chain straight to a GL1TCH wallet and is recorded here with its transaction (the latest 50 are
          listed), so you can check it yourself. Our own test payments are listed too, marked, and never counted.
        </p>
      </header>

      {!rev ? (
        <section className={styles.empty}>
          <span className={styles.emptyTag}>ledger unreachable</span>
          <h2 className={styles.emptyH}>The ledger can&apos;t be reached right now.</h2>
          <p className={styles.emptyP}>
            The revenue ledger lives on the GL1TCH bot server and didn&apos;t answer. This page shows no
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
          <section className={styles.totals}>
            <div className={styles.stat}><span className={styles.statV}>{rev.paid.count.toLocaleString("en-US")}</span><span className={styles.statK}>paid calls</span></div>
            <div className={styles.stat}><span className={styles.statV}>{usd(rev.paid.usdMicro)}</span><span className={styles.statK}>earned (USDC)</span></div>
            <div className={styles.stat}><span className={styles.statV}>{rev.since ? new Date(rev.since).toISOString().slice(0, 10) : "—"}</span><span className={styles.statK}>first payment</span></div>
          </section>

          <section className={styles.ledger}>
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
          </section>
        </>
      )}

      {rev && rev.recent.length > 0 && (
        <section className={styles.how}>
          <span className={styles.kicker}>Latest payments</span>
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
          <Link href="/scan" className={styles.btnGhost}>Free scanner</Link>
        </div>
      </section>
    </main>
  );
}
