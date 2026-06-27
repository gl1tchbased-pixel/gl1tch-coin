import type { Metadata } from "next";
import { Sparkline } from "@/components/ui/Sparkline";
import { RadialGauge } from "@/components/ui/RadialGauge";
import { Badge } from "@/components/ui/Badge";
import { MarketChartEmbed } from "@/components/web3/MarketChartEmbed";
import {
  dashboardGroups,
  campaigns,
  HERO,
  SIGNAL_HEALTH,
  CONCENTRATION,
  ACTIVITY,
  LAST_UPDATED,
} from "@/content/dashboard";
import {
  TRUST_REPORT,
  CURRENT_LAUNCH_STATUS,
  LAUNCH_STATUS,
  CONTRACT_ADDRESS,
} from "@/lib/official";
import {
  analyticsLive,
  fetchOnChain,
  formatUsd,
  formatCount,
  formatPct,
  trendOf,
} from "@/lib/analytics";
import styles from "./dashboard.module.css";

// Re-fetch live metrics at most once per minute.
export const revalidate = 60;

type MetricOverride = { value: string; delta: string; trend: "up" | "down" | "flat" };

export const metadata: Metadata = {
  title: "Founder Dashboard — GL1TCH",
  description: "Internal command center.",
  robots: { index: false, follow: false },
};

const trend = (t: "up" | "down" | "flat") =>
  t === "up" ? "▲" : t === "down" ? "▼" : "■";

const trustRows = [
  { label: "Mint revoked", ok: TRUST_REPORT.mintRevoked },
  { label: "Freeze revoked", ok: TRUST_REPORT.freezeRevoked },
  { label: "LP burned / locked", ok: TRUST_REPORT.lpBurnedOrLocked },
];

export default async function DashboardPage() {
  const live = CURRENT_LAUNCH_STATUS === LAUNCH_STATUS.LIVE;

  const liveData = analyticsLive(CONTRACT_ADDRESS)
    ? await fetchOnChain(CONTRACT_ADDRESS)
    : null;

  // Override the mock On-Chain metrics with live values when available.
  const overrides: Record<string, MetricOverride> = {};
  if (liveData) {
    const m = liveData.metrics;
    overrides["m-holders"] = {
      value: formatCount(m.holders),
      delta: m.holders !== null ? "live" : "needs Birdeye key",
      trend: "flat",
    };
    overrides["m-mcap"] = {
      value: formatUsd(m.marketCapUsd),
      delta: m.priceChange24h !== null ? formatPct(m.priceChange24h) : "live",
      trend: trendOf(m.priceChange24h),
    };
    overrides["m-vol"] = { value: formatUsd(m.volume24hUsd), delta: "24h", trend: "flat" };
    overrides["m-liq"] = { value: formatUsd(m.liquidityUsd), delta: "live", trend: "flat" };
  }

  const liveOn = liveData !== null;
  const updated = liveData
    ? new Date(liveData.fetchedAt).toISOString().slice(0, 16).replace("T", " ") + " UTC"
    : LAST_UPDATED;

  return (
    <div className={`container ${styles.wrap}`}>
      {/* Command header */}
      <header className={styles.head}>
        <div>
          <span className="t-eyebrow">Mission Control</span>
          <h1 className="t-h2" style={{ marginTop: "var(--space-3)" }}>
            Signal Command Center
          </h1>
        </div>
        <div className={styles.headMeta}>
          <Badge variant={live ? "signal" : "glitch"}>
            {live ? "LIVE" : "PRE-LAUNCH"}
          </Badge>
          <Badge variant={liveOn ? "signal" : "neutral"}>
            {liveOn ? `Live · ${liveData!.source}` : "Mock data"}
          </Badge>
          <span className={styles.updated}>Updated {updated}</span>
        </div>
      </header>

      {/* Hero KPI strip */}
      <div className={styles.heroStrip}>
        {HERO.map((h) => (
          <div key={h.id} className={styles.heroItem}>
            <span className={styles.heroValue}>
              {h.value}
              {h.sub && <span className={styles.heroSub}> {h.sub}</span>}
            </span>
            <span className={styles.heroLabel}>{h.label}</span>
          </div>
        ))}
      </div>

      {/* Signal health + trust */}
      <div className={styles.topGrid}>
        <div className={`${styles.card} ${styles.gaugeCard}`}>
          <RadialGauge score={SIGNAL_HEALTH.score} label={SIGNAL_HEALTH.label} />
          <div className={styles.gaugeBody}>
            <h2 className={styles.cardTitle}>{SIGNAL_HEALTH.label}</h2>
            <p className={styles.cardNote}>{SIGNAL_HEALTH.note}</p>
            <ul className={styles.factors}>
              {SIGNAL_HEALTH.factors.map((f) => (
                <li key={f.label}>
                  <div className={styles.factorTop}>
                    <span>{f.label}</span>
                    <span className={styles.factorVal}>{f.value}%</span>
                  </div>
                  <div className={styles.bar}>
                    <span style={{ width: `${f.value}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className={styles.card}>
          <h2 className={styles.cardTitle}>On-Chain Trust</h2>
          <div className={styles.trust}>
            {trustRows.map((r) => (
              <div key={r.label} className={styles.trustRow}>
                <span className={r.ok ? styles.ok : styles.pending}>
                  {r.ok ? "✓" : "○"}
                </span>
                <span className={styles.trustLabel}>{r.label}</span>
                <span className={styles.trustState}>
                  {r.ok ? "verified" : "at launch"}
                </span>
              </div>
            ))}
          </div>
          <div className={styles.conc}>
            <span className={styles.concLabel}>
              Holder concentration (whale ≥ {CONCENTRATION.whaleThreshold}%)
            </span>
            {CONCENTRATION.top.map((t) => (
              <div key={t.label} className={styles.concRow}>
                <span>{t.label}</span>
                <span className={styles.concPct}>{live ? `${t.pct}%` : "—"}</span>
              </div>
            ))}
            <p className={styles.cardNote}>{CONCENTRATION.note}</p>
          </div>
        </div>
      </div>

      {/* Live price chart */}
      <section className={styles.group}>
        <h2 className={styles.groupTitle}>Live Price Chart</h2>
        <MarketChartEmbed />
      </section>

      {/* Metric groups */}
      {dashboardGroups.map((group) => (
        <section key={group.title} className={styles.group}>
          <h2 className={styles.groupTitle}>{group.title}</h2>
          <div className={styles.grid}>
            {group.metrics.map((m) => {
              const o = overrides[m.id];
              const value = o?.value ?? m.value;
              const delta = o?.delta ?? m.delta;
              const mt = o?.trend ?? m.trend;
              return (
                <div key={m.id} id={m.id} className={styles.metric}>
                  <span className={styles.metricLabel}>{m.label}</span>
                  <span className={styles.metricValue}>{value}</span>
                  <div className={styles.spark}>
                    <Sparkline data={m.spark} />
                  </div>
                  <span className={`${styles.delta} ${styles["t_" + mt]}`}>
                    {trend(mt)} {delta}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      ))}

      {/* Activity + campaigns */}
      <div className={styles.bottomGrid}>
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Transmission Log</h2>
          <ul className={styles.log}>
            {ACTIVITY.map((a) => (
              <li key={a.id} className={styles.logRow}>
                <span className={`${styles.logTime} ${styles["k_" + a.kind]}`}>
                  {a.time}
                </span>
                <span className={styles.logText}>{a.text}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Campaigns</h2>
          <div className={styles.campaigns}>
            {campaigns.map((c) => (
              <div key={c.id} className={styles.campaign}>
                <div className={styles.campaignTop}>
                  <span className={styles.campaignName}>{c.name}</span>
                  <Badge variant={c.status === "Active" ? "signal" : "neutral"}>
                    {c.status}
                  </Badge>
                </div>
                <span className={styles.campaignNote}>{c.note}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <p className={styles.note}>
        Internal view. On-chain metrics go live automatically once{" "}
        <code>CONTRACT_ADDRESS</code> is set (DEXScreener; holder count needs{" "}
        <code>BIRDEYE_API_KEY</code>). Force mock with <code>ANALYTICS_LIVE=false</code>.
        Growth metrics are still mock — wire to X / Telegram APIs.
      </p>
    </div>
  );
}
