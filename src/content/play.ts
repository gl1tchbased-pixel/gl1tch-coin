// Rug or Not? — the /play deck. Every token here is made up: tickers, addresses and numbers are
// fictional, and the page labels them so. The answer on each card is checked against
// `isRugByRules` in play.test.ts, so a card can't drift from the rules it teaches.

export interface PlayCard {
  id: string;
  ticker: string;
  /** Shortened, fictional address — never resolvable to a real token. */
  addr: string;
  mintRevoked: boolean;
  freezeRevoked: boolean;
  lpLockedPct: number;
  topHolderPct: number;
  /** The largest account is the liquidity / bonding-curve pool, not a person. */
  topIsPool: boolean;
  taxPct: number;
  /** Rugs by the same deployer in the last 30 days. */
  deployerRugs: number;
  rug: boolean;
  /** One-sentence lesson shown after the answer. */
  lesson: string;
}

export type RowTone = "ok" | "warn" | "bad";
export interface PlayRow { key: string; label: string; value: string; tone: RowTone; note?: string }

/** The rules the game teaches: any one of these makes a token a rug. */
export function isRugByRules(c: PlayCard): boolean {
  return (
    !c.mintRevoked ||
    !c.freezeRevoked ||
    c.lpLockedPct < 50 ||
    (!c.topIsPool && c.topHolderPct > 30) ||
    c.taxPct > 10 ||
    c.deployerRugs >= 2
  );
}

/** The six rows of a card, toned the way the reveal colours them. A rug always has a red row. */
export function playRows(c: PlayCard): PlayRow[] {
  return [
    { key: "mint", label: "Mint authority", value: c.mintRevoked ? "revoked" : "ACTIVE", tone: c.mintRevoked ? "ok" : "bad" },
    { key: "freeze", label: "Freeze authority", value: c.freezeRevoked ? "revoked" : "ACTIVE", tone: c.freezeRevoked ? "ok" : "bad" },
    { key: "lp", label: "LP locked / burned", value: `${c.lpLockedPct}%`, tone: c.lpLockedPct >= 90 ? "ok" : c.lpLockedPct >= 50 ? "warn" : "bad" },
    {
      key: "top", label: "Top holder", value: `${c.topHolderPct}%`,
      tone: c.topIsPool ? "ok" : c.topHolderPct > 30 ? "bad" : c.topHolderPct > 10 ? "warn" : "ok",
      note: c.topIsPool ? "account: the liquidity pool" : undefined,
    },
    { key: "tax", label: "Buy / sell tax", value: `${c.taxPct}%`, tone: c.taxPct > 10 ? "bad" : c.taxPct > 0 ? "warn" : "ok" },
    {
      key: "dep", label: "Deployer history", value: c.deployerRugs ? `${c.deployerRugs} rug${c.deployerRugs > 1 ? "s" : ""} / 30d` : "clean",
      tone: c.deployerRugs >= 2 ? "bad" : c.deployerRugs === 1 ? "warn" : "ok",
    },
  ];
}

const card = (c: Omit<PlayCard, "id">): PlayCard => ({ id: c.ticker.slice(1).toLowerCase(), ...c });
const CLEAN = { mintRevoked: true, freezeRevoked: true, lpLockedPct: 100, topIsPool: false, taxPct: 0, deployerRugs: 0 };

export const PLAY_DECK: PlayCard[] = [
  // ---- safe ----
  card({ ...CLEAN, ticker: "$NEONFROG", addr: "Nf4x…8kQe", topHolderPct: 4.1, rug: false, lesson: "Everything checks out: authorities revoked, liquidity locked, holders spread out, and the deployer has no history." }),
  card({ ...CLEAN, ticker: "$GLOWWORM", addr: "Gw8t…2mVa", topHolderPct: 12, taxPct: 1, rug: false, lesson: "A 1% tax and a 12% holder deserve a look, but neither is a rug signal. Not every warning means rug." }),
  card({ ...CLEAN, ticker: "$BYTEBUNNY", addr: "Bb2n…7rTx", lpLockedPct: 85, topHolderPct: 9, rug: false, lesson: "85% of the liquidity is locked. Not perfect, but pulling the rest can't drain the pool." }),
  card({ ...CLEAN, ticker: "$QUIETOWL", addr: "Qo6w…4hLp", topHolderPct: 5.5, deployerRugs: 1, rug: false, lesson: "One earlier token from this deployer died. One is a data point, not a pattern; the Signal Graph flags repeat behaviour." }),
  card({ ...CLEAN, ticker: "$SOFTSERVE", addr: "Ss1v…9dKe", topHolderPct: 15, taxPct: 3, rug: false, lesson: "A 3% tax and a 15% top holder are worth watching, not a trap. The authorities and the pool are what can take your money." }),
  card({ ...CLEAN, ticker: "$LAMPLIGHT", addr: "Ll7p…3sWq", topHolderPct: 6.8, rug: false, lesson: "Clean contract, locked pool, no deployer record. Boring is good." }),
  card({ ...CLEAN, ticker: "$PAPERCRANE", addr: "Pc5r…1nZb", topHolderPct: 22, rug: false, lesson: "A 22% wallet is concentrated, but it can't mint, freeze or pull the pool. Concentration is a risk, not a rug." }),
  // ---- traps: the biggest account is the pool ----
  card({ ...CLEAN, ticker: "$PIXELAPE", addr: "Px2m…6yHu", topHolderPct: 97.8, topIsPool: true, rug: false, lesson: "The 97.8% account is the bonding-curve pool itself, not a person. Same as $GL1TCH on its Proof page. Trick question." }),
  card({ ...CLEAN, ticker: "$TINYCOMET", addr: "Tc3m…5gRa", topHolderPct: 88.4, topIsPool: true, rug: false, lesson: "88% sits in the liquidity pool, which is where tokens wait to be bought. Check who the top holder is before you panic." }),
  card({ ...CLEAN, ticker: "$MOSSBALL", addr: "Mb9s…0wEc", topHolderPct: 64, topIsPool: true, rug: false, lesson: "The largest account is the pool. Set it aside and the holders are spread out." }),
  // ---- rugs ----
  card({ ...CLEAN, ticker: "$VOIDCAT", addr: "Vc9q…3jPa", mintRevoked: false, topHolderPct: 6.2, rug: true, lesson: "Mint authority is live. The dev can print billions of new tokens and zero the price at any moment." }),
  card({ ...CLEAN, ticker: "$ROCKETDOG", addr: "Rd7k…8bNs", lpLockedPct: 0, topHolderPct: 8.4, rug: true, lesson: "0% of the liquidity is locked. The dev can pull the whole pool in one transaction." }),
  card({ ...CLEAN, ticker: "$SIGMAPUP", addr: "Sg3p…2cVd", topHolderPct: 3.3, deployerRugs: 5, rug: true, lesson: "The contract is spotless, but this deployer rugged 5 tokens in 30 days. The contract is new; the person isn't." }),
  card({ ...CLEAN, ticker: "$HONEYBEAR", addr: "Hb5r…7tMf", freezeRevoked: false, topHolderPct: 5, rug: true, lesson: "Freeze authority is live. Your wallet can be frozen so you can't sell: the classic honeypot." }),
  card({ ...CLEAN, ticker: "$MOONTAX", addr: "Mt1x…4kQs", topHolderPct: 7.1, taxPct: 25, rug: true, lesson: "A 25% sell tax: a quarter of your money stays behind on the way out, and the next move is often 99%." }),
  card({ ...CLEAN, ticker: "$WHALEBAIT", addr: "Wb4t…6pXe", topHolderPct: 46, rug: true, lesson: "One wallet that isn't the pool holds 46%. One sell and the chart goes vertical, downward." }),
  card({ ...CLEAN, ticker: "$GHOSTFARM", addr: "Gf8m…1rLo", lpLockedPct: 30, topHolderPct: 9, rug: true, lesson: "Only 30% of the liquidity is locked. The other 70% can leave whenever the dev wants." }),
  card({ ...CLEAN, ticker: "$DOUBLEDIP", addr: "Dd6p…9sAk", mintRevoked: false, topHolderPct: 11, taxPct: 8, rug: true, lesson: "Live mint authority. The 8% tax is a distraction; unlimited supply is the real problem." }),
  card({ ...CLEAN, ticker: "$FROSTBITE", addr: "Fb2t…5eWn", freezeRevoked: false, topHolderPct: 4.4, rug: true, lesson: "Everything looks perfect except one switch: freeze authority is still on." }),
  card({ ...CLEAN, ticker: "$CLONEKING", addr: "Ck7g…3hYu", topHolderPct: 6, deployerRugs: 3, rug: true, lesson: "Third token this month from the same deployer; the first two went to zero." }),
  card({ ...CLEAN, ticker: "$SKIMCOIN", addr: "Sk5m…8vBa", topHolderPct: 8, taxPct: 15, rug: true, lesson: "15% each way. Over a buy and a sell that's more than a quarter of your stake." }),
  card({ ...CLEAN, ticker: "$INSIDERZ", addr: "Iz3r…2qDf", topHolderPct: 38, rug: true, lesson: "38% in one wallet that isn't the pool. That's a dev wallet in a disguise." }),
  card({ ...CLEAN, ticker: "$LASTCALL", addr: "Lc9l…6nGt", lpLockedPct: 12, topHolderPct: 7.5, rug: true, lesson: "12% locked. A pool you can't trust is a pool that can vanish." }),
  card({ ...CLEAN, ticker: "$PERFECTO", addr: "Pf1c…0mJw", mintRevoked: false, topHolderPct: 3, rug: true, lesson: "Textbook clean except one thing, and that's the point: one live mint authority outweighs ten good signs." }),
];

export const DECK_SIZE = 8;
const WEEK = 7 * 24 * 3600 * 1000;
const EPOCH = Date.UTC(2026, 9, 19); // Monday of the week /play launched

/** Week number the deck rotates on (UTC). */
export const deckWeek = (now = Date.now()) => Math.floor((now - EPOCH) / WEEK);

function seeded(seed: number) {
  let a = (seed * 2654435761) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffle<T>(list: T[], r: () => number): T[] {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

/** This week's 8 cards: one pool trap, four rugs, three safe — same for everyone all week. */
export function weeklyDeck(week = deckWeek()): PlayCard[] {
  const r = seeded(week + 1000);
  const traps = PLAY_DECK.filter((c) => c.topIsPool && !c.rug);
  const rugs = PLAY_DECK.filter((c) => c.rug);
  const safe = PLAY_DECK.filter((c) => !c.rug && !c.topIsPool);
  const picked = [...shuffle(traps, r).slice(0, 1), ...shuffle(rugs, r).slice(0, 4), ...shuffle(safe, r).slice(0, 3)];
  const order = shuffle(picked, r);
  // the trick card lands mid-deck, after the player has learned the basics
  const ti = order.findIndex((c) => c.topIsPool);
  const at = 2 + (week & 3);
  [order[ti], order[at]] = [order[at], order[ti]];
  return order;
}

export const PLAY_TITLES = [
  { min: 8, title: "Ghost Node detective" },
  { min: 6, title: "Core Node" },
  { min: 4, title: "Signal Bearer" },
  { min: 0, title: "Observer" },
] as const;

export const playTitle = (score: number) => (PLAY_TITLES.find((t) => score >= t.min) ?? PLAY_TITLES[3]).title;

export function playVerdictLine(score: number): string {
  if (score === DECK_SIZE) return "No rug fooled you. Share the card and dare a friend.";
  if (score >= 5) return "Good eye. The ones you missed always live in the same place: authorities, liquidity, the deployer.";
  return "Rugs are sneaky. Play again; every round's explanation was a lesson.";
}
