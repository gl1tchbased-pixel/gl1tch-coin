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
export interface NavItem {
  id: string;
  label: string;
  href: string;
  blurb: string;
}

/** Header dropdowns (and the mobile menu's sections): everything GL1TCH runs, one click from any page. */
export const NAV_GROUPS: { id: string; label: string; items: NavItem[] }[] = [
  {
    id: "products",
    label: "Products",
    items: [
      { id: "nav-scan", label: "Scanner", href: "/scan", blurb: "Any token, any chain. Safe, sus, or rug-shaped." },
      { id: "nav-blinks", label: "⚡ Safe Swap Blinks", href: "/blinks", blurb: "Anti-rug Solana Blinks with Jupiter routing & instant sharing." },
      { id: "nav-radar", label: "Rug Radar", href: "/radar", blurb: "The riskiest fresh launches, swept hourly." },
      { id: "nav-yield", label: "Yield X-Ray", href: "/yield", blurb: "Where an APY comes from, read from the chain." },
      { id: "nav-agents", label: "Agent Trust", href: "/agents", blurb: "Know Your Agent: verify an AI agent's wallet." },
      { id: "nav-quantum", label: "Quantum Core", href: "/quantum-core", blurb: "Verifiable randomness and post-quantum tools." },
    ],
  },
  {
    id: "proof",
    label: "Proof",
    items: [
      { id: "nav-proof", label: "Live proof", href: "/proof", blurb: "The scanner run on $GL1TCH itself, with every receipt." },
      { id: "nav-revenue", label: "Revenue", href: "/revenue", blurb: "What the paid agent API earns, from settled payments." },
      { id: "nav-buyback", label: "Buyback ledger", href: "/buyback", blurb: "Revenue-funded buybacks and burns. None yet." },
      { id: "nav-security", label: "Security", href: "/security", blurb: "Read-only by design: what GL1TCH can and can't do." },
      { id: "nav-network", label: "Network stats", href: "/network", blurb: "Live engine metrics and the Signal Graph." },
      { id: "nav-verify-scan", label: "Verify a verdict", href: "/verify-scan", blurb: "Check a scan against its seal on Solana." },
    ],
  },
  {
    id: "build",
    label: "Build",
    items: [
      { id: "nav-blinks-build", label: "Solana Blinks & Actions", href: "/blinks", blurb: "Embed safe token swaps and scan cards anywhere on X." },
      { id: "nav-agent-api", label: "Agent API", href: "/agents/docs", blurb: "Token safety for AI agents: pay per call, MCP, docs." },
      { id: "nav-agent-directory", label: "Agent directory", href: "/agents/directory", blurb: "AI agents with a public trust record." },
      { id: "nav-random", label: "Randomness API", href: "/quantum-core/random", blurb: "Random draws anyone can verify." },
      { id: "nav-embed", label: "Embed badge", href: "/embed", blurb: "A live safety badge for your token's site." },
    ],
  },
  {
    id: "learn",
    label: "Learn",
    items: [
      { id: "nav-learn", label: "Guides", href: "/learn", blurb: "Spot a rug, read an APY, verify an agent." },
      { id: "nav-news", label: "Updates", href: "/news", blurb: "What shipped, newest first." },
      { id: "nav-roadmap", label: "Roadmap", href: "/roadmap", blurb: "Shipped, in progress and planned." },
      { id: "nav-whitepaper", label: "Whitepaper", href: "/whitepaper", blurb: "How GL1TCH works, in full." },
      { id: "nav-token", label: "Why hold $GL1TCH", href: "/token", blurb: "What the token is for, honestly." },
      { id: "nav-lore", label: "Lore", href: "/lore", blurb: "The archive behind the glitch." },
    ],
  },
];

export const NAV_LINKS = [
  { id: "nav-play", label: "Play", href: "/play" },
  { id: "nav-live", label: "Live", href: "/live" },
] as const;

export const FOOTER_LINKS = [
  { id: "foot-scan", label: "Scanner", href: "/scan" },
  { id: "foot-blinks", label: "Safe Swap Blinks", href: "/blinks" },
  { id: "foot-proof", label: "Proof", href: "/proof" },
  { id: "foot-play", label: "Rug or Not?", href: "/play" },
  { id: "foot-security", label: "Security", href: "/security" },
  { id: "foot-agents", label: "Agent Trust", href: "/agents" },
  { id: "foot-thesis", label: "Thesis", href: "/thesis" },
  { id: "foot-token", label: "Why Hold", href: "/token" },
  { id: "foot-buyback", label: "Buyback Ledger", href: "/buyback" },
  { id: "foot-revenue", label: "Revenue", href: "/revenue" },
  { id: "foot-network", label: "Network Stats", href: "/network" },
  { id: "foot-quantum", label: "Quantum Core", href: "/quantum-core" },
  { id: "foot-radar", label: "Rug Radar", href: "/radar" },
  { id: "foot-yield", label: "Yield X-Ray", href: "/yield" },
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
