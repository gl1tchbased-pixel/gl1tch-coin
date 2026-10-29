import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { shareMeta } from "@/lib/share-meta";
import { findOpportunity, getYieldHistory, getYieldSnapshot } from "@/lib/yield/client";
import { CHAIN_LABEL, DEX_METHOD_TEXT, KIND_LABEL, METHOD_TEXT, PROTOCOLS, WINDOW_TEXT } from "@/lib/yield/copy";
import { ago, pct, usd } from "@/lib/yield/format";
import { gasCostUsd, ilBreakEvenRatio } from "@/lib/yield/math";
import { riskOf } from "@/lib/yield/risk";
import { cardUrl, displayName, protocolName, scanLinks, shareText, telegramLink } from "@/lib/yield/view";
import type { YieldOpportunity, YieldSnapshot } from "@/lib/yield/types";
import { YieldCalculator } from "@/components/yield/YieldCalculator";
import { LpCalculator } from "@/components/yield/LpCalculator";
import { CardActions } from "@/components/yield/CardActions";
import { RiskPanel } from "@/components/yield/RiskPanel";
import { VerifyBlock } from "@/components/yield/VerifyBlock";
import { Sparkline } from "@/components/yield/Sparkline";
import { Disclaimer, Unavailable, YieldSubnav } from "@/components/yield/YieldChrome";
import styles from "../yield.module.css";

export const revalidate = 300;

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const o = findOpportunity(await getYieldSnapshot(), id);
  if (!o) return { title: "Yield X-Ray | GL1TCH", alternates: { canonical: `/yield/${id}` } };
  const name = `${displayName(o)} on ${CHAIN_LABEL[o.chain]}`;
  const apy = o.apy == null ? "still measuring" : `${pct(o.apy)} ${o.kind === "dex-lp" ? "fee APR" : "APY"}`;
  return shareMeta({
    title: `${name}: ${apy} — Yield X-Ray | GL1TCH`,
    description: `Where the ${displayName(o)} yield on ${protocolName(o)} comes from, how you get out, its risk score and the on-chain request to verify it. Not financial advice.`,
    alternates: { canonical: `/yield/${o.id}` },
  });
}

/** Default entry + exit cost for the calculator, from the chain's live gas price. */
function defaultCost(o: YieldOpportunity, snap: YieldSnapshot): { usd: number; note: string } {
  if (o.chain === "solana") {
    return { usd: 0.01, note: "Solana network fees are a fraction of a cent per transaction; priority fees can add a little. Change it if you pay more." };
  }
  if (o.chain === "tron") {
    return { usd: 0, note: "Tron charges fees in energy and bandwidth, which depends on what your account has staked. Enter your own cost." };
  }
  const g = snap.gas[o.chain];
  if (!g || g.nativeUsd == null) return { usd: 0, note: "Gas price unavailable right now; enter your own cost." };
  const usdCost = gasCostUsd(g.gwei, g.nativeUsd);
  return {
    usd: usdCost,
    note: `Estimated from ${CHAIN_LABEL[o.chain]}'s gas price right now (${g.gwei.toFixed(3)} gwei) for approve + deposit + withdraw, about 446,000 gas. Busy days can cost many times more.`,
  };
}

function apyNote(o: YieldOpportunity): string {
  if (o.apy == null) {
    return o.measuredSinceMs ? `GL1TCH started measuring ${ago(o.measuredSinceMs)}; the first reading needs 24 h of snapshots.` : "Measuring.";
  }
  return `${WINDOW_TEXT[o.window ?? ""] ?? ""}${o.measuredSinceMs ? ` · measured since ${new Date(o.measuredSinceMs).toISOString().slice(0, 10)}` : ""}`;
}

export default async function YieldCardPage({ params }: Props) {
  const { id } = await params;
  const snap = await getYieldSnapshot();
  if (!snap) {
    return (
      <section className="container" style={{ paddingBlock: "var(--space-16)" }}>
        <YieldSubnav />
        <div style={{ marginTop: "var(--space-8)" }}><Unavailable /></div>
      </section>
    );
  }
  const o = findOpportunity(snap, id);
  if (!o) notFound();

  const history = await getYieldHistory(o.id);
  const risk = riskOf(o);
  const copy = PROTOCOLS[o.protocol];
  const cost = defaultCost(o, snap);
  const links = scanLinks(o);
  const isDex = o.kind === "dex-lp";
  const breakEven = isDex && o.fullRangeApr != null ? ilBreakEvenRatio(o.fullRangeApr) : null;
  const pair = (o.tokens.length === 2 ? [o.tokens[0].symbol, o.tokens[1].symbol] : [o.symbol, "the other token"]) as [string, string];

  return (
    <section className="container" style={{ paddingBlock: "var(--space-16)", maxWidth: 960 }}>
      <div className={styles.crumbs}>
        <Link href="/yield">Yield X-Ray</Link> / {CHAIN_LABEL[o.chain]}
      </div>
      <div className={styles.cardHead}>
        <div>
          <h1 className="t-h1" style={{ margin: 0 }}>{displayName(o)}</h1>
          <p className={styles.dim} style={{ marginTop: "var(--space-2)" }}>
            {protocolName(o)} · {KIND_LABEL[o.kind]} · {CHAIN_LABEL[o.chain]}
            {o.stale && <span className={styles.stale}>stale: last read failed, showing {ago(o.updatedAt)}</span>}
          </p>
        </div>
      </div>

      <CardActions
        telegram={telegramLink(o.id)}
        url={cardUrl(o.id)}
        share={shareText(o)}
        scans={links}
        protocol={copy ? { name: copy.name, url: copy.url } : null}
      />

      <div className={styles.stats}>
        <div className={styles.stat}>
          <div className={styles.statLabel}>{isDex ? "Fee APR (pool average)" : "APY"}</div>
          <div className={styles.statValue}>{o.apy == null ? "measuring…" : pct(o.apy)}</div>
          <div className={styles.statNote}>{apyNote(o)}</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statLabel}>Deposits</div>
          <div className={styles.statValue}>{usd(o.tvlUsd)}</div>
          <div className={styles.statNote}>priced with Chainlink / the protocol&apos;s oracle</div>
        </div>
        {isDex && (
          <div className={styles.stat}>
            <div className={styles.statLabel}>Full-range position</div>
            <div className={styles.statValue}>{o.fullRangeApr == null ? "measuring…" : pct(o.fullRangeApr)}</div>
            <div className={styles.statNote}>set-and-forget across the whole price range</div>
          </div>
        )}
        {o.idleShare != null && (
          <div className={styles.stat}>
            <div className={styles.statLabel}>Can leave right now</div>
            <div className={styles.statValue}>{pct(o.idleShare, 1)}</div>
            <div className={styles.statNote}>of deposits are not lent out</div>
          </div>
        )}
        {o.feePct != null && (
          <div className={styles.stat}>
            <div className={styles.statLabel}>Pool fee</div>
            <div className={styles.statValue}>{pct(o.feePct, 1)}</div>
            <div className={styles.statNote}>of rewards, already taken out of the APY</div>
          </div>
        )}
      </div>

      <div className={styles.section}>
        <h2 className={styles.h2}>Where the yield comes from</h2>
        <p className={styles.p}>{copy?.income ?? "Not described yet."}</p>
        {copy?.note && <p className={styles.p}>{copy.note}</p>}
        <p className={styles.p}>{isDex ? DEX_METHOD_TEXT : METHOD_TEXT[o.method]}</p>
      </div>

      <div className={styles.section}>
        <h2 className={styles.h2}>How you get out</h2>
        <p className={styles.p}>{copy?.exit ?? "Not described yet."}</p>
      </div>

      <div className={styles.section}>
        <h2 className={styles.h2}>Risk</h2>
        <RiskPanel risk={risk} />
      </div>

      {isDex && (
        <div className={styles.section}>
          <h2 className={styles.h2}>Fees vs impermanent loss</h2>
          {o.apy != null && o.fullRangeApr != null && o.fullRangeApr > 0 && (
            <p className={styles.p}>
              Pool average <strong>{pct(o.apy)}</strong> vs full range <strong>{pct(o.fullRangeApr)}</strong>: most of this pool&apos;s
              liquidity sits in narrow ranges around the current price, so those positions collect about {Math.round(o.apy / o.fullRangeApr)}× the
              fees of a set-and-forget one, as long as the price stays in their range, and they take more impermanent loss when it moves.
            </p>
          )}
          {breakEven ? (
            <p className={styles.p}>
              At this fee rate, a year of fees is wiped out by impermanent loss if {pair[0]}&apos;s price moves past{" "}
              <strong>{breakEven.up.toFixed(2)}×</strong> or below <strong>{breakEven.down.toFixed(2)}×</strong> of{" "}
              {pair[1]}&apos;s over that year (full-range position; concentrated ranges hit this sooner).
            </p>
          ) : (
            <p className={styles.p}>The break-even price move appears once the fee rate has been measured.</p>
          )}
          <p className={styles.p}>
            <Link href="/yield/il" style={{ color: "var(--color-signal)" }}>Try the impermanent-loss playground →</Link>
          </p>
        </div>
      )}

      <div className={styles.section}>
        <h2 className={styles.h2}>What it means for your money</h2>
        {isDex ? (
          <LpCalculator apr={o.fullRangeApr ?? null} pair={pair} />
        ) : (
          <YieldCalculator apy={o.apy} stable={o.stable} symbol={o.asset.symbol} defaultCostUsd={cost.usd} costNote={cost.note} />
        )}
      </div>

      {history.length >= 2 && (
        <div className={styles.section}>
          <h2 className={styles.h2}>APY history</h2>
          <Sparkline points={history} />
        </div>
      )}

      <div className={styles.section}>
        <h2 className={styles.h2}>Verify it yourself</h2>
        <VerifyBlock o={o} />
      </div>

      <div className={styles.section}>
        <h2 className={styles.h2}>Get a ping if it changes</h2>
        <p className={styles.p}>
          Tap the button and the GL1TCH Telegram bot watches this yield for you: it messages you if the APY halves, deposits fall 30%,
          or withdrawals get stuck. No wallet, no sign-up. Or send <code>/yieldwatch {o.id}</code> to the bot yourself.
        </p>
        <div className={styles.actions}>
          <a className={`${styles.btn} ${styles.btnPrimary}`} href={telegramLink(o.id)} target="_blank" rel="noopener noreferrer">
            🔔 Alert me on Telegram
          </a>
          {links.map((l) => (
            <Link key={l.href} className={styles.btn} href={l.href}>{l.label} with the scanner</Link>
          ))}
        </div>
      </div>

      <div style={{ marginTop: "var(--space-12)" }}>
        <YieldSubnav />
      </div>
      <Disclaimer />
    </section>
  );
}
