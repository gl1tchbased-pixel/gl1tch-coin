import type { CommunityContent } from "@/types/content";
import { CTA_LABELS } from "./site";
import { OFFICIAL } from "@/lib/official";

export const communityContent: CommunityContent = {
  headline: "Not Followers. The Infected.",
  body: "GL1TCH is structured around belonging. Hold the signal, verify your wallet, and rise through the network — from Observer to Ghost Node — unlocking private lore, rooms, and access at every tier.",
  ranks: [
    {
      id: "rank-observer",
      rank: "Observer",
      description: "Has found the signal, not yet a carrier.",
      behavior: "Lurk, read the archive, ask questions.",
      tier: 1,
    },
    {
      id: "rank-infected",
      rank: "Infected",
      description: "Exposure confirmed. A verified holder.",
      behavior: "Hold, post, share the signal.",
      tier: 2,
    },
    {
      id: "rank-bearer",
      rank: "Signal Bearer",
      description: "Actively propagates — memes, threads, raids.",
      behavior: "Create and amplify content consistently.",
      tier: 3,
    },
    {
      id: "rank-core",
      rank: "Core Node",
      description: "Trusted, high-signal contributor.",
      behavior: "Lead raids, onboard newcomers, defend against scams.",
      tier: 4,
    },
    {
      id: "rank-ghost",
      rank: "Ghost Node",
      description: "Near-invisible, maximum influence. The inner network.",
      behavior: "Set direction, hold long, model the culture.",
      tier: 5,
    },
  ],
  cta: {
    id: "community-cta",
    label: CTA_LABELS.enterTelegram,
    href: OFFICIAL.TG_URL,
  },
};
