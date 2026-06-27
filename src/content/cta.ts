import type { CTABlock } from "@/types/content";
import { CTA_LABELS } from "./site";
import { OFFICIAL } from "@/lib/official";

export const finalCtaContent: CTABlock = {
  headline: "You Can Watch It Spread — Or Help It Spread.",
  primaryCta: {
    id: "final-cta-primary",
    label: CTA_LABELS.becomeInfected,
    href: OFFICIAL.TG_URL,
  },
  secondaryCta: {
    id: "final-cta-secondary",
    label: CTA_LABELS.viewLinks,
    href: "/links",
  },
};
