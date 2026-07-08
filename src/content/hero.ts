import type { HeroContent } from "@/types/content";
import { CTA_LABELS } from "./site";
import { OFFICIAL } from "@/lib/official";

export const heroContent: HeroContent = {
  eyebrow: "RISK INTELLIGENCE // LIVE",
  headline: "It Reads Every Rug.",
  subhead:
    "GL1TCH is crypto risk-intelligence infrastructure with a rogue-AI face: a free multi-chain scanner, the Signal Graph that remembers every deployer, and a Know Your Agent trust layer. Flags the rug before you ape — free, non-custodial, zero tax.",
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
