import type { Metadata } from "next";

type PageMeta = Metadata & { title: string; description: string };

/** Copies a page's title, description and canonical path into its Open Graph and X tags. Without it every link
 *  preview shows the root layout's site-wide title and URL. The share image comes from the route's
 *  opengraph-image file (scripts/og-cards.mjs). */
export function shareMeta(m: PageMeta): Metadata {
  const url = typeof m.alternates?.canonical === "string" ? m.alternates.canonical : undefined;
  return {
    ...m,
    openGraph: { title: m.title, description: m.description, url, siteName: "GL1TCH", type: "website", ...m.openGraph },
    twitter: { card: "summary_large_image", title: m.title, description: m.description, ...m.twitter },
  };
}
