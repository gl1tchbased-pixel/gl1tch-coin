import type { Metadata } from "next";
import Link from "next/link";
import { shareMeta } from "@/lib/share-meta";
import { getReality } from "@/lib/token-reality/client";
import { CHAIN_LABEL, collectingNote, dexLabel, pct, publishable, signedPct } from "@/lib/token-reality/view";
import type { ChainReality, RealityView } from "@/lib/token-reality/types";
import { ago } from "@/lib/yield/format";
import styles from "./reality.module.css";

export const revalidate = 600;

export const metadata: Metadata = shareMeta({
  title: "New Token Reality — what happens to new tokens in their first 3 days | GL1TCH",
  description:
    "Every hour GL1TCH samples brand-new tokens at birth on Solana, Ethereum, Base, BNB Chain, Arbitrum and Polygon (pump.fun, four.meme, Uniswap, PancakeSwap and more) and measures what happened to them three days later. Base rates, not predictions.",
  alternates: { canonical: "/new-token-reality" },
});

/** Week-by-week values as plain numbers: honest and readable even when weeks barely differ. */
function Weekly({ c }: { c: ChainReality }) {
  const pts = c.weekly.filter((w) => w.n >= 10 && w.lostHalfOrMoreShare != null).slice(-6);
  if (pts.length < 2) return null;
  return (
    <div>
      <div className={styles.sparkLabel}>Week by week (weeks with ≥10 launches)</div>
      <ol className={styles.weeks}>
        {pts.map((p) => (
          <li key={p.weekStart} title={`${p.n} launches`}>
            <span className={styles.weekDate}>{new Date(p.weekStart).toUTCString().slice(5, 11)}</span>
            <span className={styles.weekVal}>{pct(p.lostHalfOrMoreShare)}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function ChainCard({ c, view }: { c: ChainReality; view: RealityView }) {
  const p = publishable(c, view.minSample);
  return (
    <article className={styles.card} aria-labelledby={`${c.chain}-h`}>
      <div className={styles.cardHead}>
        <h2 id={`${c.chain}-h`} className={styles.chainName}>{CHAIN_LABEL[c.chain]}</h2>
        <span className={styles.window}>{p ? (p.window === "week" ? "last 7 days" : "all measured") : "collecting"}</span>
      </div>
      {p ? (
        <>
          <div>
            <div className={styles.big}>{pct(p.rates.lostHalfOrMoreShare)}</div>
            <div className={styles.bigLabel}>stopped trading within an hour or lost at least half their value within three days</div>
            {p.rates.lostHalfOrMoreCi && (
              <div className={styles.ci}>
                95% range {pct(p.rates.lostHalfOrMoreCi[0])}–{pct(p.rates.lostHalfOrMoreCi[1])} · {p.rates.n} launches measured
              </div>
            )}
          </div>
          <dl className={styles.rows}>
            <div className={styles.row}><dt>Stopped trading in the first hour</dt><dd>{pct(p.rates.stoppedShare)}</dd></div>
            <div className={styles.row}><dt>Still trading: down ≥50% after 3 days</dt><dd>{pct(p.rates.halvedShare)}</dd></div>
            <div className={styles.row}><dt>Still trading: down ≥90% after 3 days</dt><dd>{pct(p.rates.wipedShare)}</dd></div>
            <div className={styles.row}><dt>Still trading: at or above the 1-hour price</dt><dd>{pct(p.rates.upShare)}</dd></div>
            <div className={styles.row}><dt>Median 3-day change (still trading)</dt><dd>{signedPct(p.rates.medianChange72)}</dd></div>
          </dl>
          <Weekly c={c} />
          {c.byDex.length > 0 && (
            <div className={styles.dexes}>
              Where they launched: {c.byDex.slice(0, 4).map((d) => `${dexLabel(d.dex)} ${d.n}`).join(" · ")}
            </div>
          )}
        </>
      ) : (
        <>
          <p className={styles.collecting}>{collectingNote(c, view.minSample)}</p>
          <div className={styles.progress} role="progressbar" aria-valuemin={0} aria-valuemax={view.minSample} aria-valuenow={Math.min(view.minSample, Math.max(c.week.n, c.all.n))}>
            <div className={styles.progressBar} style={{ width: `${Math.min(100, (Math.max(c.week.n, c.all.n) / view.minSample) * 100)}%` }} />
          </div>
        </>
      )}
    </article>
  );
}

export default async function NewTokenRealityPage() {
  const view = await getReality();
  return (
    <section className="container" style={{ paddingBlock: "var(--space-16)" }}>
      <div className={styles.hero}>
        <span className="t-eyebrow">New Token Reality</span>
        <h1 className="t-h1" style={{ marginTop: "var(--space-3)" }}>
          What happens to a <span style={{ color: "var(--color-signal)" }}>new token</span> in three days?
        </h1>
        <p className={`t-body-lg ${styles.lede}`}>
          Every hour GL1TCH picks brand-new tokens <strong>at the moment their first pool opens</strong>, on every launchpad and DEX we can see, then checks what
          happened to them three days later. Because they are picked at birth, the ones that died quietly count as much as the ones that made headlines.
          These are base rates for a whole market, not a forecast for any one token.
        </p>
      </div>

      {view ? (
        <>
          <p className={styles.fresh}>
            Updated {ago(view.updatedAt)}
            {view.startedAt ? ` · sampling since ${new Date(view.startedAt).toUTCString().slice(5, 16)}` : ""} · a number is shown once {view.minSample} launches are measured
          </p>
          <div className={styles.grid}>
            {view.chains.map((c) => (
              <ChainCard key={c.chain} c={c} view={view} />
            ))}
          </div>
        </>
      ) : (
        <div className={styles.unavailable}>The data isn&apos;t available right now. Try again shortly, or read the JSON at <code>/api/token-reality</code>.</div>
      )}

      <div className={styles.section} id="how" style={{ scrollMarginTop: "var(--space-16)" }}>
        <h2 className={styles.h2}>How it is measured</h2>
        <ol className={styles.steps}>
          <li><strong>Picked at birth.</strong> Once an hour, up to four tokens per chain are drawn at random from the newest pools GeckoTerminal lists (pump.fun, four.meme, Uniswap v2/v3/v4, PancakeSwap, Meteora and more).</li>
          <li><strong>Only brand-new tokens.</strong> A fresh pool for an old token (a new PEPE pool, a pump.fun token moving to its AMM) is skipped: the token&apos;s earliest pool must be this one. Stablecoins and wrapped native coins are never counted.</li>
          <li><strong>Reference price one hour in,</strong> roughly when most people first hear of a token. &ldquo;Three days later&rdquo; means 72 hours after that.</li>
          <li><strong>Stopped trading</strong> = not a single trade after the first hour. <strong>Lost half</strong> = the last price within the 72 hours is at most half the 1-hour price.</li>
          <li><strong>No number before {view?.minSample ?? 30} launches.</strong> The 95% range shows how much the figure could move with a different sample of the same size.</li>
        </ol>
        <p className={styles.p}>The sampling code is open source (<code>bot/src/token-reality/</code> in the GL1TCH repository). Price data: GeckoTerminal.</p>
      </div>

      <div className={styles.section}>
        <h2 className={styles.h2}>Use it</h2>
        <p className={styles.p}>When you scan a token younger than three days, GL1TCH shows its chain&apos;s base rate next to the result.</p>
        <Link className={styles.cta} href="/scan">Scan a token →</Link>
        <pre className={styles.pre} style={{ marginTop: "var(--space-4)" }}>{`curl "https://gl1tchbased.xyz/api/token-reality?chain=base"
curl "https://gl1tchbased.xyz/api/token-reality"`}</pre>
        <p className={styles.p}>AI agents: MCP tool <code>new_token_reality</code> on <code>https://gl1tchbased.xyz/api/mcp</code>.</p>
      </div>

      <p className={styles.disclaimer}>
        Base rates from a random sample, not a prediction for any single token and not financial advice. A token that survives three days can still fail later, and a
        token that fell can recover. Sample sizes are small on quiet chains.
      </p>
    </section>
  );
}
