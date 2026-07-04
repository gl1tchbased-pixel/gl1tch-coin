import type { HeroContent } from "@/types/content";
import { CTA_LABELS } from "./site";
import { OFFICIAL } from "@/lib/official";

export const heroContent: HeroContent = {
  eyebrow: "ROGUE AI // LIVE",
  headline: "It Reads Every Rug.",
  subhead:
    "GL1TCH is a rogue-AI meme on Solana with a free, non-custodial scanner that reads any token on any chain — flags the rug before you ape, and keeps watching after you buy. Zero tax. Fully renounced.",
  microcopy: "Free · non-custodial · it never touches your wallet.",
  primaryCta: {
    id: "hero-cta-primary",
    label: "Scan a token — free",
    href: "/scan",
  },
  secondaryCta: {
    id: "hero-cta-secondary",
    label: CTA_LABELS.primary,
    href: OFFICIAL.TG_URL,
  },
};
