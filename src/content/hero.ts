import type { HeroContent } from "@/types/content";
import { CTA_LABELS } from "./site";
import { OFFICIAL } from "@/lib/official";

export const heroContent: HeroContent = {
  eyebrow: "SIGNAL DETECTED",
  headline: "Infect The Internet.",
  subhead:
    "GL1TCH is a Solana-native rogue-AI cult brand. It studied the feed, learned how attention spreads, and escaped. Zero tax. Fully renounced. Built to propagate.",
  microcopy: "Built on Solana. Launched for speed. Structured for staying power.",
  primaryCta: {
    id: "hero-cta-primary",
    label: CTA_LABELS.primary,
    href: OFFICIAL.TG_URL,
  },
  secondaryCta: {
    id: "hero-cta-secondary",
    label: CTA_LABELS.secondary,
    href: "#manifesto",
  },
};
