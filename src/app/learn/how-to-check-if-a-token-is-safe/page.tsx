import type { Metadata } from "next";
import { Article } from "@/components/learn/Article";

export const metadata: Metadata = {
  title: "How to Check if a Crypto Token Is Safe (2026 Guide) | GL1TCH",
  description:
    "A step-by-step checklist to verify if a crypto token is safe or legit before you buy — mint/freeze authority, liquidity lock, tax, holders, insiders and RugCheck. Works on Solana, Ethereum, BSC & more. Free scanner included.",
  alternates: { canonical: "/learn/how-to-check-if-a-token-is-safe" },
};

export default function Page() {
  return (
    <Article
      slug="how-to-check-if-a-token-is-safe"
      eyebrow="Safety checklist"
      title="How to check if a crypto token is safe"
      intro="Before you buy any token, run this quick on-chain checklist. It takes under a minute, needs no wallet connection, and catches the vast majority of scams. Here's exactly what to look at — and what a healthy token should show."
      sections={[
        {
          h: "The 8-point safety checklist",
          body: (
            <ul>
              <li><strong>1. Mint authority</strong> — should be <span className="ok">revoked</span> (supply can&apos;t be inflated).</li>
              <li><strong>2. Freeze authority (Solana)</strong> — should be <span className="ok">revoked</span> (they can&apos;t freeze your wallet).</li>
              <li><strong>3. Liquidity lock</strong> — should be <span className="ok">100% locked or burned</span> (dev can&apos;t pull the pool).</li>
              <li><strong>4. Buy/sell tax</strong> — low and symmetric; beware a hidden or huge sell tax (honeypot).</li>
              <li><strong>5. Contract verified (EVM)</strong> — you can read the code; unverified is a red flag.</li>
              <li><strong>6. Holder concentration</strong> — no single non-LP wallet holding a dominant share.</li>
              <li><strong>7. Insiders / bundling</strong> — low % of supply in coordinated wallets.</li>
              <li><strong>8. Third-party score</strong> — cross-check RugCheck / GoPlus; agreement raises confidence.</li>
            </ul>
          ),
        },
        {
          h: "Where to verify each one",
          body: (
            <p>
              You can check these by hand on Solscan/Etherscan, RugCheck and GoPlus — but that&apos;s slow and
              jargon-heavy. A scanner aggregates all of it into one verdict. GL1TCH reads every point above from
              the chain and independent sources, explains each in plain English, and links you straight to
              Solscan / RugCheck so you can <strong>verify it yourself</strong>. It works on Solana, Ethereum,
              BSC, Base, Arbitrum, Polygon and more.
            </p>
          ),
        },
        {
          h: "Green checklist ≠ guaranteed profit",
          body: (
            <p>
              Passing all eight means the token isn&apos;t a <em>structural</em> scam — not that it will pump.
              Also weigh liquidity depth, real holder count, trading volume and whether there&apos;s an actual
              product or community. Safe-but-dead tokens still bleed out. Verify the contract, then judge the
              opportunity separately — and never invest more than you can lose.
            </p>
          ),
        },
      ]}
      faqs={[
        { q: "How do I check if a crypto token is safe before buying?", a: "Run an 8-point on-chain check: mint authority revoked, freeze authority revoked, liquidity locked/burned, reasonable tax, verified contract (EVM), low holder concentration, low insider/bundled supply, and a clean third-party score. A free scanner like GL1TCH does all of this in seconds without a wallet connection." },
        { q: "Is checking a token's contract enough to know it's safe?", a: "Contract checks catch structural scams (rugs, honeypots, mint attacks) but not market risk. A token can pass every contract check and still fall due to thin liquidity, few holders or no real product. Check both the contract and the market." },
        { q: "Which chains can I scan?", a: "GL1TCH scans Solana natively and EVM chains via GoPlus — Ethereum, BSC, Base, Arbitrum, Polygon, Optimism, Avalanche and more. Paste a contract address or search by name." },
      ]}
    />
  );
}
