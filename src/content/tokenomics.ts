import type { TokenomicsContent } from "@/types/content";

export const tokenomicsContent: TokenomicsContent = {
  headline: "Simple Structure. Public Signal.",
  body: "$GL1TCH is a fair-launch Solana token. Zero buy/sell tax. Mint and freeze authorities revoked. Liquidity burned or locked. No presale, no hidden allocation. What you see on-chain is what exists — fully diluted value equals market value.",
  // Path A (Pump.fun) is a fair launch — supply is distributed to the open market.
  // This allocation describes the conceptual structure (Path B / treasury intent).
  allocations: [
    { label: "Public", percent: 50 },
    { label: "Community", percent: 20 },
    { label: "Marketing", percent: 15 },
    { label: "Treasury", percent: 10 },
    { label: "Team", percent: 5 },
  ],
  badges: [
    { id: "badge-tax", label: "Zero Tax", verifyKey: null },
    { id: "badge-mint", label: "Mint Revoked", verifyKey: "mintRevoked" },
    { id: "badge-freeze", label: "Freeze Revoked", verifyKey: "freezeRevoked" },
    { id: "badge-lp", label: "Liquidity Burned/Locked", verifyKey: "lpBurnedOrLocked" },
  ],
  cta: {
    id: "tokenomics-cta",
    label: "Verify Yourself",
    href: "/links",
  },
};
