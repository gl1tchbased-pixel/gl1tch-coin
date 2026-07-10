import type { RoadmapPhase } from "@/types/content";

export const roadmapPhases: RoadmapPhase[] = [
  {
    phase: 1,
    title: "Build the Myth",
    items: [
      "Brand standards, lore bible, visual system — shipped",
      "Premium website, lore archive, official-links page — live",
      "Seeded cryptic content; assembled the first Observers",
    ],
    status: "done",
  },
  {
    phase: 2,
    title: "Seed the Network",
    items: [
      "Signal propagation across X & Telegram — running",
      "Telegram bot + holder-gated ranks framework — deployed 24/7",
      "Transparent on-chain give-back wallet — published",
    ],
    status: "done",
  },
  {
    phase: 3,
    title: "Launch the Signal",
    items: [
      "Fair launch on Pump.fun — LIVE since May 2026",
      "Mint & freeze authorities revoked · Zero-tax Token-2022 · liquidity locked",
      "Holder-gated ranks utility — active end-to-end",
    ],
    status: "done",
  },
  {
    phase: 4,
    title: "Ship the Scanner",
    items: [
      "Free, non-custodial, multi-chain token safety scanner — live (web + Telegram)",
      "Watchtower: continuous re-scans + token AND wallet alerts (whale / dev sells) — live",
      "AI verdict · degen intel · deployer history · verified blue-chips · compare · shareable cards & embeddable badge — live",
      "Proof page + live self-scan trust layer (we pass our own scanner) — live",
    ],
    status: "done",
  },
  {
    phase: 5,
    title: "Scale & Entrench",
    items: [
      "Holder-gated depth: more Watchtower slots by rank — live; expanding holder perks",
      "Free listings: GeckoTerminal token info — verified & live; CoinGecko in review; DexScreener as volume returns",
      "Content flywheel (fresh explainer every cycle) + transparent, seeded give-back wallet",
      "Public-API adoption (“Scanned by GL1TCH” embeds), liquidity depth & partnerships as volume justifies",
    ],
    status: "active",
  },
  {
    phase: 6,
    title: "Quantum Core",
    items: [
      "Five working components — Vault (readiness score), Draw (NIST-CURBy verifiable randomness), Seal (X25519 + ML-KEM-768 post-quantum), Forge (quantum-inspired optimizer) — all live",
      "Verifiable Randomness-as-a-service: commit-reveal seeded by a future drand round, revealed on maturity, BLS-verified + re-derived in your browser",
      "Provably-fair Allocation/Giveaway: freeze an entrant list, draw winners from a quantum-grade seed, hand everyone a shareable proof link",
      "Tamper-evident, hash-chained public Beacon + zero-trust independent verification — non-custodial throughout",
    ],
    status: "done",
  },
  {
    phase: 7,
    title: "Make the Token Required",
    items: [
      "Metered API keys: the free human scanner stays free; programmatic/bulk throughput is $GL1TCH-gated, rate scaled by sustained-holding tier — live",
      "Randomness + Allocation gated by a holder key — usage demand becomes token demand (live)",
      "Honest, staged value-accrual: route real B2B/randomness/API revenue to holders (fee→buyback / fee-share, GMX/Chainlink/Sky model) — designed, activates only on real revenue + third-party audit + founder approval",
      "Third-party audit of the crypto + non-custodial claims (the anonymous-team trust substitute) — planned",
    ],
    status: "active",
  },
];
