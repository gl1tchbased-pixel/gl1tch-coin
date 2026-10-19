import type { TokenomicsContent } from "@/types/content";

export const tokenomicsContent: TokenomicsContent = {
  headline: "Simple Structure. Public Signal.",
  body: "$GL1TCH is a fair-launch Solana token. Zero buy/sell tax. Mint and freeze authorities revoked. Liquidity burned or locked. No presale, no hidden allocation. What you see on-chain is what exists — fully diluted value equals market value.",
  // What actually happened on-chain (Path A, Pump.fun fair launch). The conceptual Path B
  // allocation lives only in the whitepaper, labelled as such — never on the site as fact.
  launch: {
    openMarketPercent: 100,
    label: "Open market · Pump.fun bonding curve",
    facts: [
      {
        id: "open-market",
        title: "100% to the open market",
        detail: "The full 1,000,000,000 supply launched on the Pump.fun bonding curve. No presale, no private round.",
      },
      {
        id: "no-team-allocation",
        title: "No team allocation",
        detail: "No pre-mine, no vesting, no unlock schedule.",
      },
      {
        id: "deployer-exit",
        title: "Deployer sold out, then bought back ~3.1%",
        detail: "The deployer wallet sold its full position on 2026-08-20 and bought back about 3.1% of supply on 17–19 Oct 2026. Both are public on Solscan; the live balance is on the Proof page.",
      },
      {
        id: "pool-top-holder",
        title: "Biggest holder is the pool",
        detail: "The largest account is the liquidity pool, not a person. Check the live holder list yourself.",
      },
    ],
    liveHref: "/proof",
  },
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
