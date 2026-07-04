import type { Metadata } from "next";
import { RugRadar } from "@/components/web3/RugRadar";
import { LiveTrustBadge } from "@/components/web3/LiveTrustBadge";

export const metadata: Metadata = {
  title: "Rug Radar — live risk scan of fresh launches | GL1TCH",
  description:
    "The GL1TCH scanner sweeps freshly-promoted tokens and ranks them by risk, live. The ones it flags HIGH RISK get the ⚠. Real targets, refreshed hourly, free & non-custodial. A risk signal — always DYOR.",
  alternates: { canonical: "/radar" },
};

export default function RadarPage() {
  return (
    <section className="container" style={{ paddingBlock: "var(--space-16)" }}>
      <div style={{ textAlign: "center", marginBottom: "var(--space-8)" }}>
        <span className="t-eyebrow">Rug Radar</span>
        <h1 className="t-h1" style={{ marginTop: "var(--space-3)" }}>
          The riskiest <span style={{ color: "var(--color-danger)" }}>fresh launches</span>, live.
        </h1>
        <p className="t-body-lg" style={{ color: "var(--text-secondary)", maxWidth: 680, margin: "var(--space-4) auto 0" }}>
          The radar sweeps freshly-promoted tokens, runs each through the GL1TCH scanner,
          and ranks them riskiest-first — refreshed hourly. The ones it flags{" "}
          <strong style={{ color: "var(--text-primary)" }}>HIGH RISK</strong> get the ⚠.
          A risk signal on real targets, not financial advice — always DYOR.
        </p>
      </div>

      <RugRadar />

      <div style={{ marginTop: "var(--space-12)", textAlign: "center" }}>
        <p style={{ color: "var(--text-secondary)", marginBottom: "var(--space-4)" }}>
          Meanwhile, here&apos;s the scanner run on its own coin:
        </p>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <LiveTrustBadge />
        </div>
      </div>

      <div style={{ marginTop: "var(--space-12)", textAlign: "center" }}>
        <a
          href="/scan"
          style={{ display: "inline-block", padding: "16px 32px", borderRadius: "var(--radius-md)", background: "var(--color-signal)", color: "#050505", fontWeight: 700 }}
        >
          Scan any token yourself →
        </a>
      </div>
    </section>
  );
}
