import type { MetadataRoute } from "next";
import { OFFICIAL } from "@/lib/official";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: `${OFFICIAL.SITE_URL}/sitemap.xml`,
  };
}
