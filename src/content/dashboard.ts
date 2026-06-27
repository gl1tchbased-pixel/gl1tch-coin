/** Founder dashboard mock/fallback data. On-chain metrics are overridden with live
 *  values by src/lib/analytics once CONTRACT_ADDRESS is set; growth stays mock. */

export const LAST_UPDATED = "2026-05-29";

/** Composite readiness/health score shown as a radial gauge. */
export const SIGNAL_HEALTH = {
  score: 85,
  label: "Launch Readiness",
  note: "Infrastructure complete — site, bot, on-chain scripts, and trust layer ready. Awaiting go-live.",
  factors: [
    { label: "Brand & Website", value: 100 },
    { label: "Tokenomics & Trust", value: 100 },
    { label: "On-chain (devnet)", value: 80 },
    { label: "Community", value: 60 },
  ],
};

/** Always-meaningful headline strip (never empty, pre-launch friendly). */
export const HERO = [
  { id: "h-ready", label: "Launch Readiness", value: "85%" },
  { id: "h-supply", label: "Total Supply", value: "1B", sub: "fixed" },
  { id: "h-tax", label: "Tax", value: "0%" },
  { id: "h-phase", label: "Phase", value: "Build the Myth" },
];

export interface Metric {
  id: string;
  label: string;
  value: string;
  delta: string;
  trend: "up" | "down" | "flat";
  spark: number[];
}

export interface MetricGroup {
  title: string;
  metrics: Metric[];
}

export const dashboardGroups: MetricGroup[] = [
  {
    title: "Growth",
    metrics: [
      { id: "m-x", label: "X Followers", value: "—", delta: "pre-launch", trend: "flat", spark: [2, 3, 3, 4, 6, 7, 9] },
      { id: "m-impr", label: "Impressions (7d)", value: "—", delta: "pre-launch", trend: "flat", spark: [1, 2, 4, 3, 5, 8, 10] },
      { id: "m-tg", label: "Telegram Joins", value: "—", delta: "pre-launch", trend: "flat", spark: [1, 1, 2, 3, 4, 6, 8] },
      { id: "m-posters", label: "Active Posters", value: "—", delta: "pre-launch", trend: "flat", spark: [0, 1, 1, 2, 2, 3, 4] },
    ],
  },
  {
    title: "On-Chain",
    metrics: [
      { id: "m-holders", label: "Holders", value: "—", delta: "activates at launch", trend: "flat", spark: [0, 0, 0, 0, 0, 0, 0] },
      { id: "m-mcap", label: "Market Cap", value: "—", delta: "activates at launch", trend: "flat", spark: [0, 0, 0, 0, 0, 0, 0] },
      { id: "m-vol", label: "24h Volume", value: "—", delta: "activates at launch", trend: "flat", spark: [0, 0, 0, 0, 0, 0, 0] },
      { id: "m-liq", label: "Liquidity", value: "—", delta: "activates at launch", trend: "flat", spark: [0, 0, 0, 0, 0, 0, 0] },
    ],
  },
];

/** Top-holder concentration (mock). Whale threshold flags risk. */
export const CONCENTRATION = {
  whaleThreshold: 3, // percent
  top: [
    { label: "Top 1", pct: 0 },
    { label: "Top 10", pct: 0 },
    { label: "Top 50", pct: 0 },
  ],
  note: "Activates at launch via DEXScreener / Solscan. Flags any wallet over the whale threshold.",
};

export interface ActivityEvent {
  id: string;
  time: string;
  text: string;
  kind: "ok" | "info" | "warn";
}

export const ACTIVITY: ActivityEvent[] = [
  { id: "a1", time: "READY", text: "On-chain devnet dry-run passed — Trust Report PASS", kind: "ok" },
  { id: "a2", time: "READY", text: "Website + whitepaper + ranks utility deployed", kind: "ok" },
  { id: "a3", time: "READY", text: "Telegram bot built — awaiting BOT_TOKEN", kind: "info" },
  { id: "a4", time: "PENDING", text: "Founder action: register X / TG / domain", kind: "warn" },
  { id: "a5", time: "PENDING", text: "Founder action: fund launch wallet + multisig", kind: "warn" },
];

export const campaigns = [
  { id: "c-1", name: "Pre-launch lore drops", status: "Active", note: "Days 1–27 content calendar" },
  { id: "c-2", name: "Signal Bearer recruitment", status: "Active", note: "Raid/quest cadence" },
  { id: "c-3", name: "Launch-day sequence", status: "Planned", note: "T-60 → T+12h scripted posts" },
  { id: "c-4", name: "Meme contest", status: "Planned", note: "Post-launch retention" },
];
