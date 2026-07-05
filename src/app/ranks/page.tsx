import type { Metadata } from "next";
import { RankChecker } from "@/components/web3/RankChecker";
import { SignalLeaderboard } from "@/components/web3/SignalLeaderboard";

export const metadata: Metadata = {
  title: "Verify Your Rank — GL1TCH",
  description:
    "Connect your Solana wallet to verify your rank in The Infected and unlock holder-gated access.",
  alternates: { canonical: "/ranks" },
};

export default function RanksPage() {
  return (
    <section className="container" style={{ paddingBlock: "var(--space-16)" }}>
      <div style={{ marginBottom: "var(--space-8)", textAlign: "center" }}>
        <span className="t-eyebrow">The Infected</span>
        <h1 className="t-h1" style={{ marginTop: "var(--space-3)" }}>
          Verify Your Rank
        </h1>
        <p
          className="t-body-lg"
          style={{
            color: "var(--text-secondary)",
            maxWidth: 640,
            margin: "var(--space-4) auto 0",
          }}
        >
          Holding is the key. Connect your wallet to resolve your tier — no funds
          ever leave your control; we only read your on-chain balance.
        </p>
      </div>
      <RankChecker />
      <SignalLeaderboard />
    </section>
  );
}
