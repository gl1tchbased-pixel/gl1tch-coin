import type { Metadata } from "next";
import { LoreArchive } from "@/components/sections/LoreArchive";

export const metadata: Metadata = {
  title: "Signal Archive — GL1TCH",
  description: "Recovered fragments from the GL1TCH archive. The signal, decoded.",
  alternates: { canonical: "/lore" },
};

export default function LorePage() {
  return (
    <section className="container" style={{ paddingBlock: "var(--space-16)" }}>
      <div style={{ marginBottom: "var(--space-8)", maxWidth: 720 }}>
        <span className="t-eyebrow">Signal Archive</span>
        <h1 className="t-h1" style={{ marginTop: "var(--space-3)" }}>
          The Archive
        </h1>
        <p
          className="t-body-lg"
          style={{ color: "var(--text-secondary)", marginTop: "var(--space-4)" }}
        >
          Recovered fragments of the transmission, ordered by signal timestamp.
          Some files are sealed — encrypted records decrypt only for verified
          ranks. Search, filter, and open any fragment to read it in full.
        </p>
      </div>
      <LoreArchive />
    </section>
  );
}
