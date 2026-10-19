import localFont from "next/font/local";

// Self-hosted brand faces (OFL, Latin subset; licenses next to the files). Local files keep
// builds network-free; each face exposes a CSS variable that tokens.css composes into
// --font-display / --font-body / --font-mono with system fallbacks.

/** Display: headlines, big numbers, the wordmark. */
export const tektur = localFont({
  src: "./fonts/tektur-latin.woff2",
  weight: "400 900",
  variable: "--font-tektur",
  display: "swap",
  fallback: ["Segoe UI", "system-ui", "sans-serif"],
});

/** Body: paragraphs and UI. */
export const geist = localFont({
  src: "./fonts/geist-latin.woff2",
  weight: "100 900",
  variable: "--font-geist",
  display: "swap",
  fallback: ["system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
});

/** Data: labels, addresses, scores. Width axis lets dense UI run it slightly condensed.
 *  Not preloaded: it only sets small labels, so it shouldn't share first-paint bandwidth. */
export const martian = localFont({
  src: "./fonts/martian-latin.woff2",
  preload: false,
  weight: "100 800",
  variable: "--font-martian",
  display: "swap",
  fallback: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
  declarations: [{ prop: "font-stretch", value: "75% 112.5%" }],
});
