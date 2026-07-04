import type { MetadataRoute } from "next";
import { OFFICIAL } from "@/lib/official";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = OFFICIAL.SITE_URL;
  const routes = [
    "",
    "/scan",
    "/scan/compare",
    "/proof",
    "/radar",
    "/embed",
    "/lore",
    "/links",
    "/whitepaper",
    "/ranks",
    "/live",
    "/news",
    "/press",
  ];
  const now = new Date();
  return routes.map((path) => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: path === "" ? 1 : 0.7,
  }));
}
