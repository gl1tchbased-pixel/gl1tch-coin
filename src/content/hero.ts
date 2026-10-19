import type { HeroContent } from "@/types/content";
import { CTA_LABELS } from "./site";
import { OFFICIAL } from "@/lib/official";

export const heroContent: HeroContent = {
  eyebrow: "Risk intelligence · live",
  headline: "It Reads Every Rug.",
  subhead:
    "A free multi-chain token scanner with a rogue-AI face. Paste any contract and get the verdict in seconds, backed by the Signal Graph that remembers every deployer. It never touches your wallet.",
  microcopy: "Free · non-custodial · zero tax · not financial advice",
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
