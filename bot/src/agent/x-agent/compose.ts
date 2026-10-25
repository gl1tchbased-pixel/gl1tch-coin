import { OFFICIAL } from "../../content.js";
import type { Category, Variant, Voice } from "./types.js";
import type { RadarCatch, Signals } from "./signals.js";

/**
 * Post composer: drafts X posts from what the product actually did (the latest Rug Radar sweep, people-run scan
 * counts, shipped features) instead of a fixed template pool, so batches don't repeat and every claim is something
 * a reader can check. Pure: the caller passes the data plus a "when was this last used" lookup, and stores the
 * returned marks so the same token, red flag or feature doesn't come back for days.
 *
 * House rules for every draft: under 280 characters, probabilistic wording about other people's tokens (a risk
 * signal, never an accusation), and no claim about $GL1TCH that a reader can't verify.
 */

const SITE = OFFICIAL.SITE.replace(/^https?:\/\//, "").replace(/\/$/, "");
const TG = OFFICIAL.TG.replace(/^https?:\/\//, "");
const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const MAX = 280;
/** Only these are a "catch"; CAUTION and below are not worth calling out by name. */
const FLAGGED = new Set(["RUG-SHAPED", "HIGH RISK"]);
/** Dates follow the project's own convention (Europe/Istanbul), e.g. the user/auto counter split "since 20 Oct". */
const TZ = "Europe/Istanbul";

export interface Draft {
  variant: Variant;
  /** Keys to stamp with the current time once the draft is sent (e.g. `mint:<address>`, `topic:lp`). */
  marks: string[];
}

export interface ComposeInput {
  sig: Signals;
  seed: number;
  now: number;
  lastUsed: (key: string) => number | null;
  /** Learned category weight from the 🔥/👍/🥱 ratings (1 = neutral). */
  weight?: (c: Category) => number;
}

interface Topic {
  key: string;
  match: RegExp;
  title: string;
  why: string;
  check: string;
}

/** Red flags the scanner reports, keyed to its check labels (src/lib/scan.ts on the site). */
export const TOPICS: Topic[] = [
  {
    key: "lp",
    match: /LP locked|liquidity is not locked/i,
    title: "Unlocked liquidity",
    why: "Unlocked LP can be pulled in one transaction, leaving holders with nothing to sell into.",
    check: "look for the LP locked/burned % on the pool page.",
  },
  {
    key: "liquidity",
    match: /^Liquidity/i,
    title: "Paper-thin liquidity",
    why: "With a few hundred dollars in the pool, one sell moves the price 50%+. Exits fail on slippage long before any rug.",
    check: "compare the pool size with the market cap you'd be buying at.",
  },
  {
    key: "mint",
    match: /Mint authority/i,
    title: "Live mint authority",
    why: "Whoever holds the mint authority can print new supply at any time and dilute every holder.",
    check: "the mint authority should say revoked (null).",
  },
  {
    key: "freeze",
    match: /Freeze authority/i,
    title: "Live freeze authority",
    why: "A live freeze authority can lock tokens inside your wallet, so you can't sell or move them.",
    check: "the freeze authority should say revoked (null).",
  },
  {
    key: "holders",
    match: /Top holder/i,
    title: "One wallet holds too much",
    why: "When a single wallet (pool excluded) holds a big slice of supply, one sell decides the chart for everyone else.",
    check: "look at the top holder's share, pool excluded.",
  },
  {
    key: "insiders",
    match: /Insiders|bundled/i,
    title: "Bundled launch wallets",
    why: "Bundled launch buys mean one group behind many \"different\" wallets. The holder count looks healthy; the distribution isn't.",
    check: "look for wallets that bought in the launch block.",
  },
  {
    key: "deployer",
    match: /^Deployer/i,
    title: "The deployer's track record",
    why: "The wallet that launched a token has a history. Serial launchers who abandoned earlier tokens tend to do it again.",
    check: "look up the deployer's earlier tokens.",
  },
  {
    key: "age",
    match: /Token age/i,
    title: "Hours-old tokens",
    why: "An hours-old token has no track record. Not a red flag by itself, but none of its risks have been tested yet.",
    check: "compare its age with how much it already promises.",
  },
  {
    key: "rugcheck",
    match: /RugCheck/i,
    title: "A high RugCheck score",
    why: "A high RugCheck score bundles several risks into one number, and usually one item is the real problem.",
    check: "read the itemized risks, not just the score.",
  },
];

export function topicOf(reason: string): Topic | null {
  return TOPICS.find((t) => t.match.test(reason)) ?? null;
}

/** Token names are set by whoever launched the token: keep letters and digits only, so a name can't smuggle a link,
 *  an @mention or a fake cashtag into our post. */
export function displayName(c: Pick<RadarCatch, "symbol" | "name" | "mint">): string {
  const sym = (c.symbol ?? "").normalize("NFKC").replace(/[^A-Za-z0-9]/g, "");
  if (/^[A-Za-z][A-Za-z0-9]{1,11}$/.test(sym)) return `$${sym.toUpperCase()}`;
  const name = (c.name ?? "").normalize("NFKC").replace(/[^A-Za-z0-9 ]/g, "").replace(/\s+/g, " ").trim().slice(0, 20);
  return name ? `"${name}"` : `${c.mint.slice(0, 4)}…${c.mint.slice(-4)}`;
}

const cleanReason = (r: string) => r.replace(/\s+/g, " ").replace(/[<>@]/g, "").trim().slice(0, 60);
const fresh = (input: ComposeInput, key: string, ms: number) => {
  const t = input.lastUsed(key);
  return t === null || input.now - t >= ms;
};
/** The first candidate (in seed-rotated order) that fits in a post. */
function fit(candidates: string[], seed: number): string | null {
  for (let i = 0; i < candidates.length; i++) {
    const text = candidates[(Math.abs(seed) + i) % candidates.length];
    if (text.length <= MAX) return text;
  }
  return null;
}

let counter = 0;
function draft(category: Category, voice: Voice, text: string, seed: number, marks: string[]): Draft {
  counter = (counter + 1) % 1296;
  const id = `s.${category}.${(Math.abs(seed) * 1296 + counter).toString(36)}`;
  return { variant: { id, voice, category, text }, marks: [...marks, `kind:${category}`] };
}

function topicCounts(sig: Signals): Map<string, number> {
  const counts = new Map<string, number>();
  for (const c of sig.radar?.caught ?? []) {
    const t = topicOf(c.reason);
    if (t) counts.set(t.key, (counts.get(t.key) ?? 0) + 1);
  }
  return counts;
}

export function radarCatch(input: ComposeInput): Draft | null {
  const r = input.sig.radar;
  if (!r) return null;
  // `caught` comes riskiest-first; skip tokens we already posted about this week.
  const c = r.caught.find((x) => FLAGGED.has(x.verdict) && fresh(input, `mint:${x.mint}`, 7 * DAY));
  if (!c) return null;
  const name = displayName(c);
  const link = `${SITE}/scan/${c.chain}-${c.mint}`;
  const reason = cleanReason(c.reason);
  const text = fit(
    [
      `🚨 Fresh launch, flagged by GL1TCH Rug Radar:\n\n${name} → ${c.verdict} (${c.score}/100)\nTop signal: ${reason}\n\nA risk signal, not a verdict on anyone's intent. Full report, free:\n${link}`,
      `Radar caught one.\n\n${name}: ${c.verdict}, ${c.score}/100\nWhy: ${reason}\n\nCheck it yourself, no wallet needed:\n${link}`,
      `Before you ape ${name}: our scanner rates it ${c.verdict} (${c.score}/100).\nBiggest issue: ${reason}.\n\nNot financial advice. 30-second check:\n${link}`,
    ],
    input.seed,
  );
  return text ? draft("radar-catch", "proof", text, input.seed, [`mint:${c.mint}`]) : null;
}

export function radarDigest(input: ComposeInput): Draft | null {
  const r = input.sig.radar;
  if (!r || r.scanned === 0 || !fresh(input, "kind:radar-digest", 6 * HOUR)) return null;
  const counts = [...topicCounts(input.sig)].sort((a, b) => b[1] - a[1]);
  const top = counts[0] ? TOPICS.find((t) => t.key === counts[0][0]) : null;
  const pattern = top
    ? `Most common red flag among the riskiest ${r.caught.length}: ${top.title.toLowerCase()} (${counts[0][1]}).`
    : "";
  const candidates =
    r.flagged > 0
      ? [
          `🛰 Rug Radar, latest sweep:\n${r.scanned} fresh Solana launches scanned\n${r.flagged} flagged HIGH RISK or worse\n\n${pattern}\n\nLive and free: ${SITE}/radar`,
          `${r.scanned} brand-new Solana tokens went through the scanner in one sweep. ${r.flagged} came back HIGH RISK or RUG-SHAPED.\n\n${pattern}\n\nWatch the next sweep: ${SITE}/radar`,
        ]
      : [
          `🛰 Rug Radar, latest sweep: ${r.scanned} fresh Solana launches, none flagged HIGH RISK.\n\n"Not flagged" still isn't "safe": thin liquidity and fresh deployers don't show up as a verdict.\n\n${pattern}\n\n${SITE}/radar`,
        ];
  const text = fit(candidates.map((s) => s.replace(/\n\n\n+/g, "\n\n")), input.seed);
  return text ? draft("radar-digest", "proof", text, input.seed, []) : null;
}

export function redFlag(input: ComposeInput): Draft | null {
  const counts = topicCounts(input.sig);
  // Prefer what the radar is seeing right now, then the rest of the library; skip topics used in the last 3 days.
  const ordered = [
    ...TOPICS.filter((t) => counts.has(t.key)).sort((a, b) => (counts.get(b.key) ?? 0) - (counts.get(a.key) ?? 0)),
    ...TOPICS.filter((t) => !counts.has(t.key)),
  ];
  const t = ordered.find((x) => fresh(input, `topic:${x.key}`, 3 * DAY));
  if (!t) return null;
  const seen = counts.get(t.key);
  const r = input.sig.radar;
  const head = `📘 Red flag 101: ${t.title.toLowerCase()}\n\n${t.why}\n\nHow to check: ${t.check}`;
  // With the radar's live count when it fits, otherwise without it.
  const text = fit(
    [
      ...(seen && r ? [`${head}\n\nLatest radar sweep: ${seen} of the ${r.caught.length} riskiest had it.\n${SITE}/scan`] : []),
      `${head}\n\nFree scanner: ${SITE}/scan`,
    ],
    0,
  );
  return text ? draft("red-flag", "proof", text, input.seed, [`topic:${t.key}`]) : null;
}

interface Feature {
  key: string;
  text: (sig: Signals) => string;
}

export const FEATURES: Feature[] = [
  {
    key: "scanner",
    text: () =>
      `Paste any token address and get a verdict plus every check behind it: authorities, LP lock, holder concentration, deployer history.\n\nSolana and the major EVM chains. Free, no wallet connect, no sign-up.\n\n${SITE}/scan`,
  },
  {
    key: "telegram",
    text: () =>
      `The same scanner lives in our Telegram: drop a contract address in the chat and the bot answers with the verdict and the reasons.\n\nNothing to install, nothing to sign.\n\n${TG}`,
  },
  {
    key: "watchtower",
    text: () =>
      `Watchtower: send /watch <token> to our Telegram bot and it re-scans every 3 hours. If the risk gets worse (LP unlocked, an authority comes back, verdict drops), you get a ping.\n\nUp to 25 tokens, free.\n\n${TG}`,
  },
  {
    key: "radar",
    text: () =>
      `Rug Radar sweeps freshly launched Solana tokens every 30 minutes and ranks them riskiest-first, with the reason for each flag.\n\nNo login, nothing to buy:\n${SITE}/radar`,
  },
  {
    key: "compare",
    text: () =>
      `Torn between two tokens? Put them side by side: verdict, LP lock, authorities, holders, deployer, and which one is the safer pick.\n\n${SITE}/scan/compare`,
  },
  {
    key: "badge",
    text: () =>
      `Projects with nothing to hide can embed a live GL1TCH safety badge on their site. It shows the current verdict, not a screenshot from launch day.\n\n${SITE}/embed`,
  },
  {
    key: "verify",
    text: (sig) =>
      sig.sealedSweeps > 0
        ? `Every Rug Radar verdict is sealed on Solana as part of a Merkle root, so nobody (us included) can quietly rewrite it later.\n\nCheck one yourself. The math runs in your browser:\n${SITE}/verify-scan`
        : `Every Rug Radar verdict is recorded with a Merkle proof, so nobody (us included) can quietly rewrite it later.\n\nCheck one yourself. The math runs in your browser:\n${SITE}/verify-scan`,
  },
  {
    key: "proof",
    text: () =>
      `We built a rug scanner, so we run it on our own token, flags included. Every claim on the page links to a source we don't control.\n\n${SITE}/proof`,
  },
];

export function feature(input: ComposeInput): Draft | null {
  // Rotate through every feature before repeating one: oldest (or never) used first.
  const order = [...FEATURES].sort((a, b) => (input.lastUsed(`feature:${a.key}`) ?? -1) - (input.lastUsed(`feature:${b.key}`) ?? -1));
  const f = order.find((x) => fresh(input, `feature:${x.key}`, 2 * DAY));
  if (!f) return null;
  const text = f.text(input.sig);
  return text.length <= MAX ? draft("feature", "community", text, input.seed, [`feature:${f.key}`]) : null;
}

export function usage(input: ComposeInput): Draft | null {
  const { userScans, splitSince } = input.sig;
  if (!userScans || userScans < 50 || !splitSince || !fresh(input, "kind:usage", 2 * DAY)) return null;
  const since = new Date(splitSince).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: TZ });
  const text = `${userScans.toLocaleString("en-US")} token checks run by people (not our bots) since ${since}. Every one free, no wallet connect.\n\nWe count our automated sweeps separately, and both numbers are public:\n${SITE}/api/stats`;
  return draft("usage", "proof", text, input.seed, []);
}

export function tokenFacts(input: ComposeInput): Draft | null {
  if (!fresh(input, "kind:token", DAY)) return null;
  const text = fit(
    [
      `$GL1TCH, the parts you can verify yourself:\n• 1B fixed supply, mint + freeze authority revoked\n• 0% transfer tax (Token-2022)\n• Deployer wallet history disclosed, including its ~3.1% buy-back in October\n\n${SITE}/proof`,
      `The scanner is free and stays free. Nobody needs $GL1TCH to check a contract.\n\nHolding it gets you ranks and community rooms on Telegram. That's the whole deal, nothing hidden.\n\n${SITE}/token`,
    ],
    input.seed,
  );
  return text ? draft("token", "community", text, input.seed, []) : null;
}

const BUILDERS: Record<string, (input: ComposeInput) => Draft | null> = {
  "radar-catch": radarCatch,
  "radar-digest": radarDigest,
  "red-flag": redFlag,
  feature,
  usage,
  token: tokenFacts,
};

/** One fresh draft of a given category (the "⏭ Next" button), or null when none is left. */
export function composeOne(category: Category, input: ComposeInput): Draft | null {
  return BUILDERS[category]?.(input) ?? null;
}

/**
 * A batch of `count` drafts, each a different kind:
 *   1. the riskiest fresh radar catch (or a red-flag explainer when nothing new was flagged);
 *   2. a red-flag explainer or the sweep digest, alternating;
 *   3+. a feature, the usage count or a token post, ordered by your ratings.
 */
export function composeBatch(input: ComposeInput, count = 3): Draft[] {
  const out: Draft[] = [];
  const taken = new Set<string>();
  // Later builders in this batch must see earlier drafts' marks, or they'd pick the same subject again.
  const used = new Map<string, number>();
  const view: ComposeInput = { ...input, lastUsed: (k) => used.get(k) ?? input.lastUsed(k) };
  const add = (d: Draft | null) => {
    if (!d || out.length >= count || taken.has(d.variant.category)) return;
    out.push(d);
    taken.add(d.variant.category);
    for (const m of d.marks) used.set(m, input.now);
  };

  add(radarCatch(view) ?? redFlag(view));
  add(input.seed % 2 === 0 ? (redFlag(view) ?? radarDigest(view)) : (radarDigest(view) ?? redFlag(view)));
  const w = input.weight ?? (() => 1);
  const rest: Array<[Category, (i: ComposeInput) => Draft | null]> = [
    ["feature", feature],
    ["usage", usage],
    ["token", tokenFacts],
    ["radar-digest", radarDigest],
    ["red-flag", redFlag],
  ];
  rest.sort((a, b) => w(b[0]) - w(a[0]));
  for (const [, build] of rest) {
    if (out.length >= count) break;
    add(build(view));
  }
  return out;
}
