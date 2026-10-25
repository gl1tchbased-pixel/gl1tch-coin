import type { Metadata } from "next";
import { shareMeta } from "@/lib/share-meta";
import Link from "next/link";
import { Roadmap } from "@/components/sections/Roadmap";

export const metadata: Metadata = shareMeta({
  title: "Roadmap — what's shipped, in progress and planned | GL1TCH",
  description:
    "The GL1TCH roadmap: every phase with its status — the scanner, Rug Radar, Watchtower, Proof, Quantum Core and the work to make the token required.",
  alternates: { canonical: "/roadmap" },
});

export default function RoadmapPage() {
  return (
    <>
      <div style={{ paddingTop: "var(--space-12)" }} />
      <Roadmap />
      <p className="container" style={{ paddingBottom: "var(--space-12)", color: "var(--text-muted)" }}>
        Status reflects what is live on the site and bot today. See the{" "}
        <Link href="/whitepaper" style={{ color: "var(--signal-ink)" }}>whitepaper</Link> for the full plan.
      </p>
    </>
  );
}
