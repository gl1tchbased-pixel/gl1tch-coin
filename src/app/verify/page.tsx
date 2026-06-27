import type { Metadata } from "next";
import { VerifyClient } from "@/components/web3/VerifyClient";

export const metadata: Metadata = {
  title: "Verify Wallet — GL1TCH",
  description:
    "Sign a free, off-chain message to link your Solana wallet and unlock your GL1TCH rank and gated rooms.",
  alternates: { canonical: "/verify" },
  robots: { index: false, follow: false },
};

export default function VerifyPage() {
  return (
    <section className="container" style={{ paddingBlock: "var(--space-16)" }}>
      <div style={{ marginBottom: "var(--space-8)", textAlign: "center" }}>
        <span className="t-eyebrow">The Infected</span>
        <h1 className="t-h1" style={{ marginTop: "var(--space-3)" }}>
          Verify Your Wallet
        </h1>
        <p
          className="t-body-lg"
          style={{
            color: "var(--text-secondary)",
            maxWidth: 640,
            margin: "var(--space-4) auto 0",
          }}
        >
          You arrived from the Telegram bot. Connect your wallet and sign once — this
          proves you hold $GL1TCH without ever moving funds or granting spending
          access. Your rank and room links are sent back to you in Telegram.
        </p>
      </div>
      <VerifyClient />
    </section>
  );
}
