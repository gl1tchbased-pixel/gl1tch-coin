import type { Metadata } from "next";
import { shareMeta } from "@/lib/share-meta";
import { getTruth } from "@/lib/rpc-truth/client";
import { DEPTHS, GRADE_META, depthCell, findings, hostOf, recordText, sortEndpoints, spanText, summarize } from "@/lib/rpc-truth/view";
import type { ChainReport, TruthView } from "@/lib/rpc-truth/types";
import { ago } from "@/lib/yield/format";
import styles from "./rpc-truth.module.css";

export const revalidate = 300;

export const metadata: Metadata = shareMeta({
  title: "RPC Truth Monitor — which free RPCs answer history honestly? | GL1TCH",
  description:
    "Free public RPC endpoints sometimes return an empty answer for data that exists. Wallets then show “no activity” and scanners say “clean”. GL1TCH asks every free Solana, Ethereum, Base, BNB Chain, Arbitrum and Polygon endpoint the same history questions every 6 hours and publishes who told the truth.",
  alternates: { canonical: "/rpc-truth" },
});

function until(ms: number, now = Date.now()): string {
  const m = Math.max(0, Math.round((ms - now) / 60_000));
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} h ${m % 60} min`;
}

function Summary({ view }: { view: TruthView }) {
  const s = summarize(view);
  return (
    <>
      <div className={styles.stats}>
        <div className={styles.stat}>
          <div className={styles.statLabel}>Endpoints measured</div>
          <div className={styles.statValue}>{s.endpoints}</div>
          <div className={styles.statNote}>on {s.chains} chains, keyless</div>
        </div>
        <div className={`${styles.stat} ${s.silent ? styles.statBad : ""}`}>
          <div className={styles.statLabel}>Silent failures now</div>
          <div className={styles.statValue}>{s.silent}</div>
          <div className={styles.statNote}>returned nothing where data exists</div>
        </div>
        <div className={`${styles.stat} ${styles.statGood}`}>
          <div className={styles.statLabel}>Fully correct</div>
          <div className={styles.statValue}>{s.correct}</div>
          <div className={styles.statNote}>every provable history check</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statLabel}>Down</div>
          <div className={styles.statValue}>{s.down}</div>
          <div className={styles.statNote}>no answer to the basic check</div>
        </div>
      </div>
      <p className={styles.fresh}>
        Measured {ago(view.finishedAt)} · next pass in about {until(view.nextRunAt)} · a pass every {Math.round(view.intervalMs / 3_600_000)} h
      </p>
    </>
  );
}

function Findings({ view }: { view: TruthView }) {
  const list = findings(view);
  if (!list.length) {
    return (
      <div className={styles.allClear}>
        <strong>No silent failures on the latest pass.</strong> Every empty answer this time was either honest (nobody had that data) or came with a clear error.
      </div>
    );
  }
  return (
    <div className={styles.alert} role="region" aria-label="Silent failures on the latest pass">
      <h2 className={styles.alertTitle}>
        Silent failures right now: {list.length} silent answer{list.length === 1 ? "" : "s"} from {new Set(list.map((f) => f.endpointId)).size} endpoint
        {new Set(list.map((f) => f.endpointId)).size === 1 ? "" : "s"}
      </h2>
      <p className={styles.alertLede}>
        Each of these answered <em>successfully</em> but with nothing (or less) for data that another provider returned for the exact same question.
        Code reading these answers would conclude &ldquo;no transactions&rdquo;, &ldquo;no transfers&rdquo; or &ldquo;clean&rdquo;.
      </p>
      <ul className={styles.findingList}>
        {list.map((f) => (
          <li key={`${f.endpointId}-${f.method}-${f.depth}`} className={styles.finding}>
            <div className={styles.findingHead}>
              <span>{f.chainLabel}</span>
              <span className={styles.provider}>{f.provider}</span>
              <span className={styles.url}>{hostOf(f.url)}</span>
            </div>
            <div className={styles.findingBody}>
              <code>{f.method}</code> — {f.question}: {f.verdict === "silent_empty" ? "returned an empty answer" : `returned ${f.got} result(s)`}
              {f.expected != null ? ` while ${f.expected} exist (agreed by at least two other providers).` : " while another provider returned the data."}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ChainTable({ chain, view }: { chain: ChainReport; view: TruthView }) {
  const rows = sortEndpoints(chain.endpoints);
  const evm = chain.chain !== "solana";
  return (
    <section id={chain.chain} className={styles.chain} aria-labelledby={`${chain.chain}-title`}>
      <div className={styles.chainHead}>
        <h2 id={`${chain.chain}-title`} className={styles.chainTitle}>{chain.label}</h2>
        <span className={styles.chainMeta}>
          {chain.endpoints.length} endpoints
          {chain.referenceHead ? ` · ${evm ? "block" : "slot"} ${chain.referenceHead.toLocaleString("en-US")}` : ""}
          {chain.blockTimeSec ? ` · ${chain.blockTimeSec}s per ${evm ? "block" : "slot"} (measured)` : ""}
        </span>
      </div>
      {chain.note && <p className={styles.note}>{chain.note}</p>}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <caption className={styles.srOnly}>{chain.label}: free RPC endpoints and how they answered the history checks</caption>
          <thead>
            <tr>
              <th scope="col" className={styles.endpointCell}>Endpoint</th>
              <th scope="col">Verdict</th>
              {DEPTHS.map((d) => (
                <th key={d} scope="col" className={styles.center}>{d} back</th>
              ))}
              {evm && <th scope="col">getLogs span</th>}
              <th scope="col">Lag</th>
              <th scope="col">Latency</th>
              <th scope="col">Last 7 days</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((e) => {
              const g = GRADE_META[e.grade];
              return (
                <tr key={e.id}>
                  <td className={styles.endpointCell}>
                    <div className={styles.provider}>{e.provider.replace(/-/g, " ")}</div>
                    <div className={styles.url}>{e.url}</div>
                  </td>
                  <td>
                    <span className={`${styles.pill} ${styles[g.tone]}`} title={e.headError ? `${g.meaning} (${e.headError})` : g.meaning}>{g.label}</span>
                  </td>
                  {DEPTHS.map((d) => {
                    const c = depthCell(chain, e, d);
                    return (
                      <td key={d} className={styles.center}>
                        <span className={`${styles.cell} ${styles[`c_${c.state}`]}`} title={c.detail}>
                          {c.text}
                          <span className={styles.srOnly}> — {c.detail}</span>
                        </span>
                      </td>
                    );
                  })}
                  {evm && <td className={styles.num}>{spanText(e)}</td>}
                  <td className={styles.num}>{e.headLagSec == null ? "—" : `${e.headLagSec}s`}</td>
                  <td className={styles.num}>{e.latencyMs == null ? "—" : `${e.latencyMs} ms`}</td>
                  <td className={`${styles.num} ${styles.dim}`}>{recordText(view.records[e.id])}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default async function RpcTruthPage() {
  const view = await getTruth();

  return (
    <section className="container" style={{ paddingBlock: "var(--space-16)" }}>
      <div className={styles.hero}>
        <span className="t-eyebrow">RPC Truth Monitor</span>
        <h1 className="t-h1" style={{ marginTop: "var(--space-3)" }}>
          Which free RPCs <span style={{ color: "var(--color-signal)" }}>tell the truth</span>?
        </h1>
        <p className={`t-body-lg ${styles.lede}`}>
          Free public RPC endpoints sometimes answer a question about older data with an <strong>empty, successful response</strong> instead of an error.
          A wallet then shows &ldquo;no activity&rdquo;, a security scanner says &ldquo;clean&rdquo;, an AI agent concludes &ldquo;no risk&rdquo;.
          Every 6 hours GL1TCH asks every free endpoint of six chains the same history questions and publishes who answered correctly, who said
          &ldquo;I can&apos;t&rdquo; honestly, and who silently returned nothing.
        </p>
      </div>

      {view ? (
        <>
          <Summary view={view} />
          <Findings view={view} />
          <nav className={styles.chainNav} aria-label="Chains">
            {view.chains.map((c) => (
              <a key={c.chain} href={`#${c.chain}`}>
                {c.label}
                {c.endpoints.some((e) => e.grade === "silent_failure") && <span className={styles.dotBad} aria-label="has silent failures" />}
              </a>
            ))}
          </nav>
          {view.chains.map((c) => (
            <ChainTable key={c.chain} chain={c} view={view} />
          ))}
        </>
      ) : (
        <div className={styles.unavailable}>
          The latest measurement isn&apos;t available right now (the first pass runs a few minutes after a restart). Try again shortly, or read the JSON at{" "}
          <code>/api/rpc-truth</code>.
        </div>
      )}

      <div className={styles.section}>
        <h2 className={styles.h2}>What the verdicts mean</h2>
        <div className={styles.legend}>
          {(Object.keys(GRADE_META) as (keyof typeof GRADE_META)[]).map((k) => (
            <div key={k} className={styles.legendItem}>
              <span className={`${styles.pill} ${styles[GRADE_META[k].tone]}`}>{GRADE_META[k].label}</span>
              <p>{GRADE_META[k].meaning}</p>
            </div>
          ))}
        </div>
        <p className={styles.p} style={{ marginTop: "var(--space-4)" }}>
          Cells: <strong>✓</strong> correct · <strong>✗ silent</strong> empty or short answer for data that exists · <strong>says no</strong> a clear error (needs a key, history not kept, range too wide) · <strong>…</strong> rate-limited or timed out · <strong>?</strong> no free endpoint could show this data, so nothing is judged.
        </p>
      </div>

      <div id="how" className={styles.section} style={{ scrollMarginTop: "var(--space-16)" }}>
        <h2 className={styles.h2}>How it is measured</h2>
        <ol className={styles.steps}>
          <li>
            <strong>Same question for everyone.</strong> On EVM chains each endpoint is asked for Circle USDC <code>Transfer</code> logs in the same 8-block window, 1 hour,
            1 day, 7 days and 30 days back. On Solana: the same block, the same transaction and the same address history at those depths.
          </li>
          <li>
            <strong>Existence is proven, not assumed.</strong> If any endpoint returns well-formed data for the exact window, the data exists. An endpoint that
            answered &ldquo;nothing&rdquo; for that same window is a silent failure.
          </li>
          <li>
            <strong>Completeness needs two independent providers.</strong> A different non-empty answer is only called wrong when at least two different providers
            agree byte-for-byte (same count, same transaction ids). Two URLs run by the same company never count as two opinions.
          </li>
          <li>
            <strong>Errors are honest.</strong> &ldquo;Needs a key&rdquo;, &ldquo;history not kept&rdquo; or &ldquo;range too wide&rdquo; are fine answers and never count as
            failures. Rate limits and timeouts are inconclusive: nothing is concluded from them.
          </li>
          <li>
            <strong>History we can&apos;t prove isn&apos;t judged.</strong> If no free endpoint serves a depth (for example 30-day logs on some chains), refusing it is not a
            failure.
          </li>
          <li>
            <strong>Polite by design.</strong> About 15 requests per endpoint every 6 hours, one at a time, with a pause between them. Block times are measured from the
            chain, never assumed.
          </li>
        </ol>
        <p className={styles.p}>
          The measuring code is open source (<code>bot/src/rpc-truth/</code> in the GL1TCH repository), so every verdict can be reproduced.
        </p>
      </div>

      <div className={styles.section}>
        <h2 className={styles.h2}>Use it in code</h2>
        <p className={styles.p}>Free JSON, updated with every pass. Ask for the endpoints worth using on a chain, optionally with a minimum history depth or getLogs span:</p>
        <pre className={styles.pre}>{`curl "https://gl1tchbased.xyz/api/rpc-truth?chain=base&depth=7d"
curl "https://gl1tchbased.xyz/api/rpc-truth?chain=ethereum&depth=30d&minSpan=10000"
curl "https://gl1tchbased.xyz/api/rpc-truth"            # everything, with every probe`}</pre>
        <p className={styles.p}>
          AI agents can ask the same through the GL1TCH MCP server (<code>https://gl1tchbased.xyz/api/mcp</code>, tool <code>rpc_truth</code>). Recommendations never include an
          endpoint with a silent failure in the last 7 days.
        </p>
      </div>

      <p className={styles.disclaimer}>
        Measurements are snapshots of public, keyless endpoints and can change at any time; providers&apos; own terms apply to their endpoints. GL1TCH is not affiliated with
        any provider listed. A paid plan or a key from the same provider may behave differently. Spotted something wrong? Tell us via the links in the footer.
      </p>
    </section>
  );
}
