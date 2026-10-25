import type { Metadata } from "next";
import { shareMeta } from "@/lib/share-meta";
import Link from "next/link";
import { VerdictVerifier } from "@/components/web3/VerdictVerifier";

export const metadata: Metadata = shareMeta({
  title: "Verify a verdict — sealed on Solana | GL1TCH",
  description:
    "Check that a GL1TCH Rug Radar verdict existed at the time it was given and hasn't been edited since. The Merkle proof is recomputed and the Solana seal is read in your own browser — no trust in GL1TCH required.",
  alternates: { canonical: "/verify-scan" },
});

const steps = [
  {
    n: "1",
    title: "Every sweep is recorded",
    body: "Each Rug Radar sweep's verdicts (token, verdict, score, time) become the leaves of a Merkle tree.",
  },
  {
    n: "2",
    title: "Its root is sealed on Solana",
    body: "One SPL Memo transaction, signed by GL1TCH's dedicated attester wallet, puts the root on-chain. That seal can't be edited later.",
  },
  {
    n: "3",
    title: "You check it on your device",
    body: "Your browser recomputes the proof and reads the seal from a Solana RPC, so you don't have to trust GL1TCH's servers.",
  },
];

export default async function VerifyScanPage({ searchParams }: { searchParams: Promise<{ mint?: string; chain?: string }> }) {
  const sp = await searchParams;
  return (
    <section className="container" style={{ paddingBlock: "var(--space-16)" }}>
      <div style={{ textAlign: "center", marginBottom: "var(--space-8)" }}>
        <span className="t-eyebrow">Verdict anchoring</span>
        <h1 className="t-h1" style={{ marginTop: "var(--space-3)" }}>
          Don&apos;t trust the verdict. <span style={{ color: "var(--color-signal)" }}>Verify it.</span>
        </h1>
        <p className="t-body-lg" style={{ color: "var(--text-secondary)", maxWidth: 680, margin: "var(--space-4) auto 0" }}>
          Prove that GL1TCH flagged a token when it says it did, and that the verdict hasn&apos;t been quietly changed
          since. The check runs on your device.
        </p>
      </div>

      <VerdictVerifier initialMint={sp.mint?.slice(0, 64)} initialChain={sp.chain === undefined ? "solana" : sp.chain.slice(0, 16)} />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "var(--space-4)",
          maxWidth: 760,
          margin: "var(--space-12) auto 0",
        }}
      >
        {steps.map((s) => (
          <div
            key={s.n}
            style={{ padding: "var(--space-5)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", background: "var(--color-surface)" }}
          >
            <span style={{ fontFamily: "var(--font-mono)", color: "var(--color-signal)", fontWeight: 800 }}>{s.n}</span>
            <h2 style={{ fontSize: 17, fontWeight: 700, margin: "6px 0", color: "var(--text-primary)" }}>{s.title}</h2>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: "var(--text-secondary)" }}>{s.body}</p>
          </div>
        ))}
      </div>

      <p style={{ textAlign: "center", marginTop: "var(--space-10)", color: "var(--text-secondary)" }}>
        Find a token to check on the{" "}
        <Link href="/radar" style={{ color: "var(--color-signal)" }}>
          Rug Radar →
        </Link>
      </p>
    </section>
  );
}
