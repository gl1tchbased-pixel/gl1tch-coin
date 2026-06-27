import type { DailyStats } from "./activity.js";

export interface DailyPost {
  x: string; // <= 280 chars, plain text
  telegram: string; // HTML
}

/** Whole days since the start date (in tz), 1-based. Day 1 = the start date. */
export function computeDayNumber(startDateISO: string, at: number, timezone: string): number {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(at));
  const a = Date.parse(`${startDateISO}T00:00:00Z`);
  const b = Date.parse(`${today}T00:00:00Z`);
  const diff = Math.floor((b - a) / 86_400_000);
  return Math.max(1, diff + 1);
}

const TICKER = "$GL1TCH";
const HASHTAGS = "#GL1TCH #Solana #memecoin";

function plural(n: number, word: string): string {
  return `${n.toLocaleString("en-US")} ${word}${n === 1 ? "" : "s"}`;
}

const HEADERS = ["SIGNAL LOG", "TRANSMISSION", "STATUS REPORT", "NETWORK DISPATCH"];

/** Brand/value-prop lines for quiet days (no activity to report). */
const EVERGREEN = [
  "Zero tax. Mint and freeze authorities renounced. Liquidity locked. Built to outlast the hype.",
  "Holding is the key — hold, verify your wallet, and rise through the ranks of The Infected.",
  "Attention is the only currency that compounds while you sleep. The myth is being built.",
  "No presale. No hidden allocation. What you see on-chain is what exists.",
  "Premium by design. Solana-fast. Community-owned. The signal does not ask permission to spread.",
  "The Core Nodes are watching. Every signal carried brings the next host online.",
];

const CLOSERS = [
  "Infect the internet.",
  "Hold. Verify. Rise.",
  "The signal spreads through you.",
  "Exposure is irreversible.",
];

/** A human, grammatical summary of the day's activity, or null on a quiet day. */
function activityLine(s: DailyStats): string | null {
  const parts: string[] = [];
  if (s.newMembers > 0) parts.push(`+${plural(s.newMembers, "node")} joined`);
  if (s.messages > 0) parts.push(`${plural(s.messages, "signal")} transmitted`);
  if (s.uniquePosters > 1) parts.push(plural(s.uniquePosters, "active node"));
  return parts.length > 0 ? `The Infected: ${parts.join(" · ")}.` : null;
}

function clamp(text: string, max = 280): string {
  return text.length <= max ? text : text.slice(0, max - 1).trimEnd() + "…";
}

/** Build the day's post for both surfaces. Deterministic given stats + day. */
export function generateDailyPost(stats: DailyStats, day: number): DailyPost {
  const header = `${HEADERS[(day - 1) % HEADERS.length]} // DAY ${day}`;
  // Only lead with stats once there's real momentum; otherwise keep it premium
  // with brand/value-prop messaging (avoids weak "1 signal" posts pre-traction).
  const hasMomentum = stats.newMembers > 0 || stats.messages >= 5 || stats.uniquePosters > 1;
  const body = (hasMomentum && activityLine(stats)) || EVERGREEN[(day - 1) % EVERGREEN.length];
  const closer = `${CLOSERS[(day - 1) % CLOSERS.length]} ${TICKER}`;

  const x = clamp(`${header}\n\n${body}\n\n${closer}\n\n${HASHTAGS}`);
  const telegram = `<b>${header}</b>\n\n${body}\n\n<i>${closer}</i>`;

  return { x, telegram };
}
