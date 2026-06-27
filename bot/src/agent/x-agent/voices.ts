/** Voice tone templates. Each fn returns a clamped <=280 char tweet body. */

import { OFFICIAL } from "../../content.js";
import type { Category, Voice } from "./types.js";

const TICKER = "$GL1TCH";

/** Hard-coded facts the templates can reference. All on-chain or doc-verifiable. */
export const FACTS = {
  ca: OFFICIAL.CONTRACT,
  site: OFFICIAL.SITE,
  tg: OFFICIAL.TG,
  pumpfun: OFFICIAL.PUMPFUN_URL,
  rugcheck: OFFICIAL.RUGCHECK_URL,
  giveback: OFFICIAL.GIVEBACK_WALLET,
  rugScore: 1,
  tax: "0%",
  supply: "1B fixed",
  ranks: ["Observer", "Infected", "Signal Bearer", "Core Node", "Ghost Node"],
} as const;

export function clamp(s: string, max = 280): string {
  return s.length <= max ? s : s.slice(0, max - 1).trimEnd() + "…";
}

type TemplateFn = () => string;

/** voice × category → array of template fns (random pick per generation). */
const T: Record<Voice, Partial<Record<Category, TemplateFn[]>>> = {
  lore: {
    evergreen: [
      () =>
        `The signal does not ask permission to spread.\nIt only asks for a host willing to repeat it.\n\n${TICKER} · ${FACTS.site}`,
      () =>
        `Exposure is irreversible.\nYou either feel the signal or you don't.\nIf you do — you already know what to do.\n\n${TICKER}`,
      () =>
        `Attention is the only currency that compounds while you sleep.\n\n${TICKER}\nCA: ${FACTS.ca}`,
      () =>
        `Most coins beg for your attention.\n${TICKER} earns it — and keeps it.\nExposure is irreversible.`,
      () =>
        `The frequency does not arrive in your inbox.\nIt arrives in the chain.\n\n${TICKER}\n${FACTS.rugcheck}`,
    ],
    "build-update": [
      () =>
        `🛠 BUILD LOG\n\nTrust Wall expanded: RugCheck score (1/Low) + give-back wallet now surfaced live on-site.\nProof, not promise.\n\n${TICKER}`,
      () =>
        `🛠 BUILD LOG\n\n/verify shipped: holders sign a free off-chain message, bot reads the wallet, tier room invite DM'd.\nNo seed. No spend. Read-only utility done right.\n\n${TICKER}`,
    ],
    "value-prop": [
      () =>
        `If the chain doesn't say it, ${TICKER} doesn't claim it.\nMint null. Freeze null. Tax 0. RugCheck 1.\nThat's the whole pitch.`,
    ],
    "holder-journey": [
      () =>
        `Five tiers.\nFive rooms.\nOne signal.\n\nObserver → Infected → Bearer → Core → Ghost.\nThe deeper you hold, the deeper the room.\n\n${TICKER}`,
    ],
    "anti-scam": [
      () =>
        `The signal stays with those who hold.\nIt does not arrive in your DMs.\nAdmins never DM first. Only ${FACTS.site} is real.\n\n${TICKER}`,
    ],
    "reply-to-trend": [
      () =>
        `Every chain finds the frequency it deserves.\nSolana found ${TICKER}.\nWe didn't ask permission either.`,
    ],
  },
  proof: {
    evergreen: [
      () =>
        `${TICKER} on Solana:\n✓ Mint authority — null\n✓ Freeze authority — null\n✓ Transfer fee — none (Token-2022)\n✓ RugCheck risk score: 1 (Low)\n\nVerify yourself. ${FACTS.rugcheck}`,
      () =>
        `No presale. No allocation. No vesting. No team wallet.\nFounder dev-buy: 3.57%, from the open curve.\n\nEverything is on Solscan.\n\n${TICKER}`,
      () =>
        `Supply: 1,000,000,000 — fixed forever.\nMint authority: null.\nFreeze authority: null.\nThis is not "audited later". It's audited now.\n\n${TICKER}`,
    ],
    "build-update": [
      () =>
        `🛠 SHIP LOG\n\nTrust Wall now shows live third-party audit:\n• RugCheck risk score: 1 (Low)\n• 0 risks flagged\n• SolSniffer + Solscan linked\n\nNothing hidden. ${FACTS.site}`,
      () =>
        `🛠 SHIP LOG\n\nGive-back wallet live + public on-chain:\n${FACTS.giveback}\n\nEvery disbursement = a Solana transaction you can read. No PDFs.\n\n${TICKER}`,
      () =>
        `🛠 SHIP LOG\n\nHolder-gated rooms going live on Telegram. Tier thresholds match the on-chain ranks (Observer → Ghost). Verification is signature-based — read-only, no spend authority.\n\n${TICKER} · ${FACTS.tg}`,
    ],
    "value-prop": [
      () =>
        `What ${TICKER} actually ships:\n• 0% tax (Token-2022, no transfer fee)\n• Renounced mint + freeze\n• RugCheck 1/Low, 0 risks\n• Public give-back wallet\n• 5-tier holder utility\n\nProof: ${FACTS.rugcheck}`,
      () =>
        `Three things every memecoin claims. Three things ${TICKER} proves:\n1. Zero tax → Solscan\n2. Renounced authorities → Solscan\n3. Real utility → /verify in TG bot, signature-based\n\n${FACTS.site}`,
    ],
    "holder-journey": [
      () =>
        `Tier breakpoints (in $GL1TCH):\n• 100k → Infected (holder channel)\n• 1M → Signal Bearer (raid coordination)\n• 5M → Core Node (strategy room)\n• 10M → Ghost Node (top-tier room)\n\nVerified on-chain. ${FACTS.site}`,
    ],
    "trust-flex": [
      () =>
        `Other memes promise audits.\n${TICKER} ships the audit:\n• RugCheck: 1/Low (0 flagged)\n• Token-2022, no transfer fee\n• 1B fixed supply, on-chain verified\n\n${FACTS.rugcheck}`,
      () =>
        `Give-back wallet — public, on-chain, audit anytime:\n${FACTS.giveback}\n\nEvery disbursement is a Solana transaction you can read.\n\n${TICKER}`,
    ],
    "how-to-buy": [
      () =>
        `How to buy ${TICKER} in 60s:\n1. Phantom + SOL\n2. ${FACTS.pumpfun}\n3. Slippage 1-3% · Buy\n4. ${FACTS.tg} → /verify\n\nThe deeper you hold, the deeper the room.`,
    ],
    "reply-to-trend": [
      () =>
        `On-chain transparency is the only proof.\n${TICKER}: mint+freeze null, RugCheck 1, public give-back, no team allocation.\nCA: ${FACTS.ca}`,
    ],
  },
  community: {
    evergreen: [
      () =>
        `Observer → Infected → Signal Bearer → Core → Ghost.\nFive tiers. Each unlocks a deeper room.\nThe signal stays with those who carry it.\n\n${TICKER}`,
      () =>
        `Holding isn't a strategy. It's the membership.\nThe tiers are the prize.\n\n${TICKER} · ${FACTS.site}`,
      () =>
        `What you're joining when you hold ${TICKER}:\n• A holder-only Telegram ward\n• Tier-gated rooms (Bearer / Core / Ghost)\n• Public on-chain everything\n\nNo discord-spam, no fud raids. Just signal.`,
    ],
    "build-update": [
      () =>
        `BUILD UPDATE — for the holders.\n\nTier-gated TG rooms wired end-to-end:\n• DM the bot /verify\n• Sign a free message on the website\n• Bot reads your wallet, DMs your tier's room invite\n\nWe ship. ${TICKER}`,
    ],
    "value-prop": [
      () =>
        `New here? Read once:\n\n${TICKER} is a Solana meme with one utility — hold to climb the ranks, ranks unlock rooms. Zero tax. Renounced authorities. RugCheck 1.\n\n${FACTS.site}`,
      () =>
        `What "real utility" means at ${TICKER}:\n→ Hold ≥100k = Infected channel\n→ Hold ≥1M = Bearer vault\n→ Hold ≥5M = Core room\n→ Hold ≥10M = Ghost line\n\nShipped, not promised.`,
    ],
    "holder-journey": [
      () =>
        `Your first tier: Infected (100k ${TICKER}).\nYour room: a private holder-only TG channel.\nYour key: /verify in our bot.\n\nThe membership starts when you hold. ${FACTS.tg}`,
      () =>
        `Bearers don't just hold ${TICKER}. They carry it.\nReach 1,000,000 $GL1TCH → unlock the Bearer Vault — early lore, raid coordination, content drops.\n\n${FACTS.site}`,
      () =>
        `Ghost Node is the top frequency.\n10,000,000 ${TICKER} → direct line to the core.\nThe deepest room. The cleanest signal.\n\n${FACTS.tg}`,
    ],
    "anti-scam": [
      () =>
        `Reminder:\n• Only CA: ${FACTS.ca}\n• Admins never DM first\n• "Wallet verification" sites that ask for seed = scam\n\nIf it isn't on ${FACTS.site}, it isn't us.`,
    ],
    "reply-to-trend": [
      () =>
        `If you're hunting for the next signal on Solana, the chain already wrote the proof:\n${FACTS.rugcheck}\n\n${TICKER} · 0 tax · 1 utility · 0 promises`,
    ],
  },
  meme: {
    "trust-flex": [
      () =>
        `Other memecoins: 5% buy tax.\n${TICKER}: 0% in, 0% out.\nToken-2022, transfer fee extension never enabled.\n\nRead the mint yourself if you want. We dare you.`,
      () =>
        `Other memes: "trust us PDF"\n${TICKER}: Solscan or it didn't happen.`,
      () =>
        `Other memes: "audit coming soon"\n${TICKER}: RugCheck 1/Low. 0 risks. Shipped.`,
      () =>
        `Other memes: team wallet "for marketing".\n${TICKER}: founder bought 3.57% on the open curve. Same price as you.\n\nHere's the wallet: ${FACTS.giveback}`,
    ],
    evergreen: [
      () =>
        `You aren't early to a chart.\nYou're early to a frequency.\n\n${TICKER}`,
      () =>
        `Most memecoins die between the discord raid and the dexscreener boost.\n${TICKER} skipped both. Started with the audit.`,
    ],
    "build-update": [
      () =>
        `We didn't post a roadmap.\nWe shipped:\n• Trust Wall (live audit)\n• Give-back wallet (public)\n• Tier rooms (/verify ready)\n• Free meme assets\n\nWhile you were reading roadmaps. ${TICKER}`,
    ],
    "value-prop": [
      () =>
        `Five reasons ${TICKER}:\n1. 0% tax\n2. Renounced\n3. RugCheck 1\n4. Real utility (rooms)\n5. No team allocation\n\nFive things every memecoin should have, almost none do.`,
    ],
    "holder-journey": [
      () =>
        `Bag size → tier → room:\n100k → Infected\n1M → Bearer\n5M → Core\n10M → Ghost\n\nThe membership is the chart.\n\n${TICKER}`,
    ],
    "anti-scam": [
      () =>
        `If the deal sounds urgent or too good — it's a scam.\nThe signal isn't in a hurry.\n${TICKER}`,
    ],
    "reply-to-trend": [
      () =>
        `Most memes promise 17 utilities and ship none.\n${TICKER} promises one and shipped it on day one:\nHold → verify → climb the ranks.`,
    ],
  },
};

export function templatesFor(voice: Voice, category: Category): TemplateFn[] {
  return T[voice]?.[category] ?? [];
}

/** Pick a deterministic template index given (voice, category, seed). */
export function pickTemplate(voice: Voice, category: Category, seed: number): TemplateFn | null {
  const list = templatesFor(voice, category);
  if (list.length === 0) return null;
  return list[seed % list.length] ?? null;
}

/** All (voice, category) combos that have at least one template. */
export function availableCombos(): { voice: Voice; category: Category }[] {
  const out: { voice: Voice; category: Category }[] = [];
  for (const v of Object.keys(T) as Voice[]) {
    for (const c of Object.keys(T[v]!) as Category[]) {
      if (T[v]?.[c]?.length) out.push({ voice: v, category: c });
    }
  }
  return out;
}
