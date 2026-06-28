import type { Metadata } from "next";
import { RugRadar } from "@/components/web3/RugRadar";
import { LiveTrustBadge } from "@/components/web3/LiveTrustBadge";

export const metadata: Metadata = {
  title: "Rug Radar — scams GL1TCH just caught | GL1TCH",
  description:
    "Live Hall of Shame: tokens the GL1TCH scanner just flagged as risky, pulled from freshly-promoted coins. Proof the rug-scanner works — on real targets, updated hourly. Free & non-custodial.",
  alternates: { canonical: "/radar" },
};

export default function RadarPage() {
  return (
    <section className="container" style={{ paddingBlock: "var(--space-16)" }}>
      <div style={{ textAlign: "center", marginBottom: "var(--space-8)" }}>
        <span className="t-eyebrow">Rug Radar</span>
        <h1 className="t-h1" style={{ marginTop: "var(--space-3)" }}>
          Scams we <span style={{ color: "var(--color-danger)" }}>just caught</span>.
        </h1>
        <p className="t-body-lg" style={{ color: "var(--text-secondary)", maxWidth: 660, margin: "var(--space-4) auto 0" }}>
          The radar sweeps freshly-promoted tokens and runs each through the GL1TCH
          scanner. Here&apos;s what it flagged — live, on real targets, refreshed hourly.
          The only &quot;scams we caught&quot; feed in the meme space.
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
