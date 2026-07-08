import type { MetadataRoute } from "next";
import { OFFICIAL } from "@/lib/official";
import { CANONICAL } from "@/lib/scan";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = OFFICIAL.SITE_URL;
  const routes = [
    "",
    "/scan",
    "/scan/compare",
    "/proof",
    "/security",
    "/agents",
    "/agents/directory",
    "/agents/docs",
    "/thesis",
    "/network",
    "/radar",
    "/embed",
    "/learn",
    "/learn/how-to-spot-a-rug-pull",
    "/learn/what-is-a-honeypot",
    "/learn/how-to-check-if-a-token-is-safe",
    "/learn/what-is-know-your-agent",
    "/learn/how-to-verify-an-ai-agent",
    "/learn/can-ai-agents-be-hacked",
    "/lore",
    "/links",
    "/whitepaper",
    "/ranks",
    "/live",
    "/news",
    "/press",
  ];
  const now = new Date();
  const staticEntries: MetadataRoute.Sitemap = routes.map((path) => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: path === "" ? 1 : 0.7,
  }));

  // Indexable per-token scan pages for well-known tokens (high-intent search: "is X safe").
  const scanEntries: MetadataRoute.Sitemap = CANONICAL.map((t) => ({
    url: `${base}/scan/${t.chain}-${t.address}`,
    lastModified: now,
    changeFrequency: "daily" as const,
    priority: 0.6,
  }));

  return [...staticEntries, ...scanEntries];
}
