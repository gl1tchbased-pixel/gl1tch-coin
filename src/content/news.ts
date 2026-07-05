/** GL1TCH updates / changelog — newest first. Edit this file to post an update. */

export type NewsTag = "launch" | "trust" | "listing" | "product" | "community";

export interface NewsItem {
  id: string;
  /** ISO date (YYYY-MM-DD). */
  date: string;
  tag: NewsTag;
  title: string;
  body: string;
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** Format an ISO date deterministically (no locale → hydration-safe). */
export function formatNewsDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}

export const TAG_LABEL: Record<NewsTag, string> = {
  launch: "Launch",
  trust: "Trust",
  listing: "Listing",
  product: "Product",
  community: "Community",
};

export const newsItems: NewsItem[] = [
  {
    id: "signal-graph",
    date: "2026-07-05",
    tag: "product",
    title: "Signal Graph is live — the scanner now has a memory",
    body: "Every token we scan is remembered against its deployer. When a wallet has shipped multiple tokens we've flagged, any fresh token from it inherits that track record — surfaced as a 'Serial deployer' warning right in the scan. It's a signal no single-token scanner (RugCheck, GoPlus) can produce, and it compounds with every scan. Scanning stays free and never gated.",
  },
  {
    id: "proof-of-signal",
    date: "2026-07-05",
    tag: "community",
    title: "Proof-of-Signal — reputation you can't fake or buy",
    body: "A new Signal Reputation fuses the hardest-to-fake signals: verified *sustained* holding (gated on a 7-day average balance, so a balance flashed for one block can't unlock a tier) plus the community you bring in. Earn XP, climb from Dormant to Beacon Prime on the /ranks leaderboard. Status only — no paid rewards, ever. Check yours with /rep in the Telegram.",
  },
  {
    id: "security-page",
    date: "2026-07-05",
    tag: "trust",
    title: "Security & Transparency page + error monitoring",
    body: "A tool that tells you what's safe has to be safe itself. Our new /security page lays out the whole posture — never a fund/approval signature, strict CSP, input validation, automated secret + dependency scanning, and a public threat model. We added production error monitoring, a responsible-disclosure policy (SECURITY.md + security.txt), and private vulnerability reporting. Verify every word yourself.",
  },
  {
    id: "site-upgrade",
    date: "2026-05-30",
    tag: "product",
    title: "Live market data, on-site",
    body: "The homepage now streams real price, market cap, liquidity and 24h volume straight from DexScreener, with an embedded live chart and one-tap Buy on Jupiter. A new 'Why Hold' section makes the holder-gated utility unmistakable.",
  },
  {
    id: "listings",
    date: "2026-05-30",
    tag: "listing",
    title: "Discovery surfaces going live",
    body: "On-chain metadata (logo, name, description) now renders automatically across GeckoTerminal, Solscan, Phantom, Jupiter and Birdeye. Free CoinGecko and GeckoTerminal token-info submissions are in review.",
  },
  {
    id: "trust-stack",
    date: "2026-05-30",
    tag: "trust",
    title: "RugCheck clean · give-back wallet published",
    body: "GL1TCH scores a RugCheck risk rating of 1 (Low, zero flags). A dedicated, public on-chain give-back wallet is now wired into the Trust Wall — every disbursement is a Solana transaction anyone can read.",
  },
  {
    id: "ranks-live",
    date: "2026-05-29",
    tag: "product",
    title: "Holder-gated ranks live 24/7",
    body: "The verification bot is running around the clock. Sign a free message, the bot reads your balance and resolves your tier from Observer to Ghost Node — no custody, no third-party gatekeeper.",
  },
  {
    id: "launch",
    date: "2026-05-29",
    tag: "launch",
    title: "GL1TCH is live on Solana",
    body: "Fair launch on Pump.fun with simultaneous contract reveal. Mint and freeze authorities revoked, fixed 1,000,000,000 supply, zero-tax Token-2022. The signal is loose.",
  },
];
