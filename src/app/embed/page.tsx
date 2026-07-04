import type { Metadata } from "next";
import { EmbedTool } from "@/components/web3/EmbedTool";

export const metadata: Metadata = {
  title: "Embed the GL1TCH badge — prove your token is clean | GL1TCH",
  description:
    "Add a live 'Scanned by GL1TCH' safety badge to your site, README or docs. It auto-updates with your token's verdict and links back to the full scan. Free, non-custodial, any chain.",
  alternates: { canonical: "/embed" },
};

const points = [
  { t: "Live, not a screenshot", d: "The badge re-renders from a fresh scan — it can never show a stale verdict." },
  { t: "Builds trust instantly", d: "Show visitors your token passed an independent, non-custodial safety scan." },
  { t: "One line to add", d: "Copy the HTML or Markdown below. Works on any site, README, Notion or docs." },
];

export default function EmbedPage() {
  return (
    <section className="container" style={{ paddingBlock: "var(--space-16)" }}>
      <div style={{ textAlign: "center", marginBottom: "var(--space-8)" }}>
        <span className="t-eyebrow">Embed</span>
        <h1 className="t-h1" style={{ marginTop: "var(--space-3)" }}>
          Put a <span style={{ color: "var(--color-signal)" }}>live safety badge</span> on your project.
        </h1>
        <p className="t-body-lg" style={{ color: "var(--text-secondary)", maxWidth: 660, margin: "var(--space-4) auto 0" }}>
          Prove your token is clean — with a badge that stays honest because it
          re-scans itself. Every badge links back to the full report. Free, any chain.
        </p>
      </div>

      <EmbedTool />

      <div style={{ marginTop: "var(--space-12)", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "var(--space-4)", maxWidth: 820, margin: "var(--space-12) auto 0" }}>
        {points.map((p) => (
          <div key={p.t} style={{ padding: "var(--space-5)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", background: "var(--color-surface)" }}>
            <div style={{ fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>{p.t}</div>
            <div style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.5 }}>{p.d}</div>
          </div>
        ))}
      </div>

      <p style={{ textAlign: "center", marginTop: "var(--space-10)", color: "var(--text-muted)", fontSize: 14 }}>
        Not a token project? <a href="/scan" style={{ color: "var(--color-signal)" }}>Just scan any token →</a>
      </p>
    </section>
  );
}
