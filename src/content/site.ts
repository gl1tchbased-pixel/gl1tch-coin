/** GL1TCH brand constants, navigation, and CTA labels. Sourced from Founder OS v3. */

import { OFFICIAL } from "@/lib/official";

export const PROJECT_NAME = "GL1TCH";
export const TICKER = "$GL1TCH";
export const COMMUNITY_NAME = "The Infected";
export const BLOCKCHAIN = "Solana";

export const TAGLINE = "Infect The Internet.";
export const META_TITLE =
  "GL1TCH — Infect The Internet | Premium Solana Meme Brand";
export const META_DESCRIPTION =
  "GL1TCH is a Solana-native rogue-AI cult brand. Zero tax. Fully renounced. Built to propagate.";

export const NAV_LINKS = [
  { id: "nav-scan", label: "Scanner", href: "/scan" },
  { id: "nav-proof", label: "Proof", href: "/proof" },
  { id: "nav-radar", label: "Rug Radar", href: "/radar" },
  { id: "nav-learn", label: "Learn", href: "/learn" },
  { id: "nav-lore", label: "Lore", href: "/lore" },
  { id: "nav-tokenomics", label: "Tokenomics", href: "/#tokenomics" },
  { id: "nav-buy", label: "How to Buy", href: "/#how-to-buy" },
  { id: "nav-ranks", label: "Ranks", href: "/ranks" },
  { id: "nav-roadmap", label: "Roadmap", href: "/#roadmap" },
  { id: "nav-live", label: "Live", href: "/live" },
  { id: "nav-whitepaper", label: "Whitepaper", href: "/whitepaper" },
  { id: "nav-faq", label: "FAQ", href: "/#faq" },
] as const;

export const FOOTER_LINKS = [
  { id: "foot-scan", label: "Scanner", href: "/scan" },
  { id: "foot-proof", label: "Proof", href: "/proof" },
  { id: "foot-security", label: "Security", href: "/security" },
  { id: "foot-radar", label: "Rug Radar", href: "/radar" },
  { id: "foot-embed", label: "Embed Badge", href: "/embed" },
  { id: "foot-learn", label: "Learn", href: "/learn" },
  { id: "foot-lore", label: "Lore", href: "/lore" },
  { id: "foot-ranks", label: "Ranks", href: "/ranks" },
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
