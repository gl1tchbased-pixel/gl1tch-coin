/** GL1TCH content type definitions. All site copy is typed and centralized. */

export interface CTA {
  id: string;
  label: string;
  href: string;
}

export interface HeroContent {
  eyebrow: string;
  headline: string;
  subhead: string;
  microcopy: string;
  primaryCta: CTA;
  secondaryCta: CTA;
}

export type LoreCategory =
  | "origin"
  | "transmission"
  | "system-alert"
  | "prophecy"
  | "corruption-log";

export interface LoreEntry {
  id: string;
  archiveNumber: string;
  timestamp: string;
  title: string;
  body: string;
  category: LoreCategory;
  /** Signal/decode integrity, flavor metadata e.g. "98%". */
  integrity?: string;
  /** Encrypted fragment — requires rank verification to decrypt. */
  locked?: boolean;
  /** Rank required to decrypt (display only). */
  requiredRank?: string;
}

export interface LaunchFact {
  id: string;
  title: string;
  detail: string;
}

/** How the supply actually launched (Pump.fun fair launch) — no conceptual table. */
export interface TokenLaunch {
  openMarketPercent: 100;
  label: string;
  facts: LaunchFact[];
  liveHref: "/proof";
}

export interface TrustBadge {
  id: string;
  label: string;
  /** key into official.ts TRUST_REPORT, or null for static claims */
  verifyKey: "mintRevoked" | "freezeRevoked" | "lpBurnedOrLocked" | null;
}

export interface TokenomicsContent {
  headline: string;
  body: string;
  launch: TokenLaunch;
  badges: TrustBadge[];
  cta: CTA;
}

export type PhaseStatus = "done" | "active" | "upcoming";

export interface RoadmapPhase {
  phase: number;
  title: string;
  items: string[];
  status: PhaseStatus;
}

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

export interface CTABlock {
  headline: string;
  primaryCta: CTA;
  secondaryCta: CTA;
}
