/** GL1TCH brand constants, navigation, and CTA labels. Sourced from Founder OS v3. */

import { OFFICIAL } from "@/lib/official";

export const PROJECT_NAME = "GL1TCH";
export const TICKER = "$GL1TCH";
export const COMMUNITY_NAME = "The Infected";
export const BLOCKCHAIN = "Solana";

export const TAGLINE = "Infect The Internet.";
export const META_TITLE =
  "GL1TCH — Crypto Risk Intelligence & Agent Trust | Reads Every Rug";
export const META_DESCRIPTION =
  "GL1TCH is crypto risk-intelligence infrastructure: a free multi-chain token scanner, the Signal Graph deployer-reputation database, and a Know Your Agent (ERC-8004-compatible) trust layer. Flags the rug before you ape — free, non-custodial.";

// Header: the products sit behind one "Products" menu, then a short row of pages.
// Everything else (Learn, Lore, Ranks, Tokenomics, Roadmap, FAQ, …) lives in the footer.
export const NAV_PRODUCTS = [
  { id: "nav-scan", label: "Scanner", href: "/scan", blurb: "Any token, any chain. Safe, sus, or rug-shaped." },
  { id: "nav-radar", label: "Rug Radar", href: "/radar", blurb: "The riskiest fresh launches, swept hourly." },
  { id: "nav-agents", label: "Agent Trust", href: "/agents", blurb: "Know Your Agent: verify an AI agent's wallet." },
  { id: "nav-quantum", label: "Quantum Core", href: "/quantum-core", blurb: "Verifiable randomness and post-quantum tools." },
  { id: "nav-network", label: "Network", href: "/network", blurb: "Live engine metrics and the Signal Graph." },
] as const;

export const NAV_LINKS = [
  { id: "nav-proof", label: "Proof", href: "/proof" },
  { id: "nav-live", label: "Live", href: "/live" },
  { id: "nav-whitepaper", label: "Whitepaper", href: "/whitepaper" },
] as const;

export const FOOTER_LINKS = [
  { id: "foot-scan", label: "Scanner", href: "/scan" },
  { id: "foot-proof", label: "Proof", href: "/proof" },
  { id: "foot-security", label: "Security", href: "/security" },
  { id: "foot-agents", label: "Agent Trust", href: "/agents" },
  { id: "foot-thesis", label: "Thesis", href: "/thesis" },
  { id: "foot-token", label: "Why Hold", href: "/token" },
  { id: "foot-buyback", label: "Buyback Ledger", href: "/buyback" },
  { id: "foot-network", label: "Network Stats", href: "/network" },
  { id: "foot-quantum", label: "Quantum Core", href: "/quantum-core" },
  { id: "foot-radar", label: "Rug Radar", href: "/radar" },
  { id: "foot-embed", label: "Embed Badge", href: "/embed" },
  { id: "foot-learn", label: "Learn", href: "/learn" },
  { id: "foot-lore", label: "Lore", href: "/lore" },
  { id: "foot-ranks", label: "Ranks", href: "/ranks" },
  { id: "foot-tokenomics", label: "Tokenomics", href: "/#tokenomics" },
  { id: "foot-roadmap", label: "Roadmap", href: "/roadmap" },
  { id: "foot-faq", label: "FAQ", href: "/#faq" },
  { id: "foot-live", label: "Live", href: "/live" },
  { id: "foot-news", label: "Updates", href: "/news" },
  { id: "foot-whitepaper", label: "Whitepaper", href: "/whitepaper" },
  { id: "foot-press", label: "Press Kit", href: "/press" },
  { id: "foot-links", label: "Official Links", href: "/links" },
] as const;

export const SOCIAL_LINKS = [
  { id: "social-x", label: "X", href: OFFICIAL.X_URL },
  { id: "social-tg", label: "Telegram", href: OFFICIAL.TG_URL },
  { id: "social-ig", label: "Instagram", href: OFFICIAL.IG_URL },
  { id: "social-rd", label: "Reddit", href: OFFICIAL.REDDIT_URL },
  { id: "social-links", label: "Official Links", href: "/links" },
] as const;

export const RANK_NAMES = [
  "Observer",
  "Infected",
  "Signal Bearer",
  "Core Node",
  "Ghost Node",
] as const;

export const CTA_LABELS = {
  primary: "Join The Infected",
  secondary: "Read The Signal",
  becomeInfected: "Become Infected",
  viewLinks: "View Official Links",
  enterTelegram: "Enter Telegram",
  openArchive: "Open Archive",
} as const;
