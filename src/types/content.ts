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

export interface ManifestoContent {
  headline: string;
  body: string;
  cta: CTA;
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

export interface TokenAllocation {
  label: string;
  percent: number;
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
  allocations: TokenAllocation[];
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

export interface RankDefinition {
  id: string;
  rank: string;
  description: string;
  behavior: string;
  tier: 1 | 2 | 3 | 4 | 5;
}

export interface CommunityContent {
  headline: string;
  body: string;
  ranks: RankDefinition[];
  cta: CTA;
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
