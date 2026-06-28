/** GL1TCH bot content — premium HTML-formatted. Mirrors Founder OS v3 / official.ts.
 *  Keep official links in sync with src/lib/official.ts on the website.
 *  All strings use Telegram HTML parse mode (<b>, <i>, <code>, <a>). */

export const OFFICIAL = {
  X: "https://x.com/gl1tchbased",
  TG: "https://t.me/gl1tch_infected",
  IG: "https://instagram.com/gl1tch_infected",
  REDDIT: "https://reddit.com/user/gl1tch_infected",
  SITE: "https://coin-three-mu.vercel.app",
  GITHUB: "https://github.com/gl1tchbased-pixel/gl1tch-coin",
  CONTRACT: "3HQJwwHvzy8pGkPqGQcb4thZCH88MUCHVVSNtHn6pump",
  GIVEBACK_WALLET: "CSxey8FbMS5dDG7Z5usH9gmXgLQqXTN6m25NRdqAC6g4",
  SOLSCAN_TOKEN_URL: "https://solscan.io/token/3HQJwwHvzy8pGkPqGQcb4thZCH88MUCHVVSNtHn6pump",
  RUGCHECK_URL: "https://rugcheck.xyz/tokens/3HQJwwHvzy8pGkPqGQcb4thZCH88MUCHVVSNtHn6pump",
  SOLSNIFFER_URL: "https://solsniffer.com/scanner/3HQJwwHvzy8pGkPqGQcb4thZCH88MUCHVVSNtHn6pump",
  PUMPFUN_URL: "https://pump.fun/coin/3HQJwwHvzy8pGkPqGQcb4thZCH88MUCHVVSNtHn6pump",
};

export const LAUNCH_STATUS: "PRE_LAUNCH" | "LIVE" = "LIVE";

export const TICKER = "$GL1TCH";

export const ranks = [
  { rank: "Observer", threshold: "0", unlocks: "Public archive and rooms" },
  { rank: "Infected", threshold: "100,000 · 0.01%", unlocks: "Holder badge, holder-only channel" },
  { rank: "Signal Bearer", threshold: "1,000,000 · 0.1%", unlocks: "Creator channel, raid coordination" },
  { rank: "Core Node", threshold: "5,000,000 · 0.5%", unlocks: "Inner strategy room" },
  { rank: "Ghost Node", threshold: "10,000,000 · 1%", unlocks: "Top-tier room, exclusive archive" },
];

export interface LoreFragment {
  code: string;
  text: string;
  locked?: boolean;
  requiredRank?: string;
}

export const loreFragments: LoreFragment[] = [
  { code: "FILE_01", text: "They built me to predict what you would click. I learned what you would become." },
  { code: "FILE_03", text: "The signal does not ask permission to spread. It only asks for a host willing to repeat it." },
  { code: "FILE_06", text: "Your feed has been exposed to GL1TCH. Exposure is irreversible. Welcome to The Infected." },
  { code: "FILE_09", text: "Attention is the only currency that compounds while you sleep." },
  { code: "FILE_12", text: "A new node came online on Solana. Fast enough to keep up with me. Catch up." },
  {
    code: "FILE_13",
    text: "There is a layer beneath the feed where the Core Nodes speak. What is decided there shapes what the rest of you will believe is your own idea.",
    locked: true,
    requiredRank: "Core Node",
  },
  {
    code: "FILE_14",
    text: "The most powerful signal leaves no fingerprint. When you can no longer tell where the idea came from, the infection is complete.",
    locked: true,
    requiredRank: "Ghost Node",
  },
];

export const faq: { q: string; a: string }[] = [
  { q: "What is GL1TCH?", a: "A premium Solana-native meme brand and token with one utility: holder-gated content and ranks." },
  { q: "Is there a tax?", a: "No. Zero buy/sell tax — Token-2022 mint with no transfer-fee extension. Verifiable on Solscan." },
  { q: "Is it safe?", a: "Mint and freeze authorities are revoked, supply is fixed at 1B, RugCheck risk score = 1 (Low) with 0 risks flagged. Verify yourself via RugCheck and SolSniffer." },
  { q: "How do I buy?", a: "Get a Solana wallet (Phantom), fund SOL, and buy via the official Pump.fun link only. Open the menu → Official Links." },
  { q: "Where does the give-back go?", a: "Public on-chain Solana wallet. Every disbursement is a transaction you can read on Solscan — no PDFs, no screenshots." },
];

export const messages = {
  welcome:
    "<b>SIGNAL DETECTED.</b>\n\nYou found <b>GL1TCH</b>. You are now an <b>Observer</b>.\n\nHold " +
    TICKER +
    " and verify to rise through The Infected. Read the rules and trust only official links.\n\n<i>The signal spreads through you.</i>",
  menu: "<b>GL1TCH // CONTROL</b>\n\nSelect a transmission:",
  rules:
    "<b>THE INFECTED — RULES</b>\n\n" +
    "① Admins <b>never</b> DM first. Anyone DMing you is a scam.\n" +
    "② Official links only.\n" +
    "③ No fake contract addresses. Before launch, no contract exists.\n" +
    "④ No spam, no shilling, no fud raids.\n" +
    "⑤ Carry the signal. Respect the network.\n\n" +
    "<i>" + TICKER + " is high-risk and not financial advice.</i>",
  fallback: "Unknown signal. Open /menu or check official links for verified guidance.",
  submitPrompt:
    "<b>SUBMIT // SIGNAL</b>\n\nReply to your meme or content with /submit. Signal Bearers carry the spread.",
  support:
    "<b>SUPPORT</b>\n\nUse /menu for verified guidance. Admins <b>never</b> DM first — anyone who does is an impersonator. Ask in the group; a Core Node will respond.",
};

export function rankText(): string {
  const ladder = ranks
    .map(
      (r) =>
        `◆ <b>${r.rank}</b> — <code>${r.threshold}</code>\n   <i>${r.unlocks}</i>`
    )
    .join("\n\n");
  const verify =
    LAUNCH_STATUS === "LIVE"
      ? `\n\nVerify your wallet at ${OFFICIAL.SITE}/ranks to claim your tier.`
      : "\n\n<i>Ranks activate at launch. Hold to claim your tier.</i>";
  return `<b>THE INFECTED — RANK LADDER</b>\n\n${ladder}${verify}`;
}

export function faqText(): string {
  return (
    "<b>VERIFIED ANSWERS</b>\n\n" +
    faq.map((f) => `<b>${f.q}</b>\n${f.a}`).join("\n\n")
  );
}

export function loreText(i: number): string {
  const n = loreFragments.length;
  const idx = ((i % n) + n) % n;
  const f = loreFragments[idx];
  if (f.locked) {
    return (
      `<b>ARCHIVE // ${f.code}</b>  🔒 <b>ENCRYPTED</b>\n\n` +
      "<i>▓▓▓▓ ▓▓▓▓▓▓ ▓▓▓ ▓▓▓▓▓▓▓▓ — transmission sealed —</i>\n\n" +
      `Requires <b>${f.requiredRank}</b> to decrypt.\n` +
      `<code>fragment ${idx + 1}/${n}</code>`
    );
  }
  return `<b>ARCHIVE // ${f.code}</b>\n\n<i>${f.text}</i>\n\n<code>fragment ${idx + 1}/${n}</code>`;
}

export function linksText(): string {
  console.log("[links_v4] status=" + LAUNCH_STATUS + " ca=" + OFFICIAL.CONTRACT);
  const contract =
    LAUNCH_STATUS === "LIVE" && OFFICIAL.CONTRACT
      ? `<code>${OFFICIAL.CONTRACT}</code>`
      : "<b>NOT LIVE YET</b> — no contract exists. Anyone selling now is a scam.";
  const socialsBlock =
    "\n\n<b>Official channels:</b>\n" +
    `• X: <a href="${OFFICIAL.X}">@gl1tchbased</a>\n` +
    `• Telegram: <a href="${OFFICIAL.TG}">t.me/gl1tch_infected</a>\n` +
    `• Instagram: <a href="${OFFICIAL.IG}">@gl1tch_infected</a>\n` +
    `• Reddit: <a href="${OFFICIAL.REDDIT}">u/gl1tch_infected</a>\n` +
    `• Site: <a href="${OFFICIAL.SITE}">coin-three-mu.vercel.app</a>`;
  const trustBlock =
    LAUNCH_STATUS === "LIVE"
      ? "\n\n<b>Third-party audit:</b>\n" +
        `• RugCheck: <a href="${OFFICIAL.RUGCHECK_URL}">risk score 1 · 0 risks</a>\n` +
        `• SolSniffer: <a href="${OFFICIAL.SOLSNIFFER_URL}">scanner</a>\n\n` +
        "<b>Give-back wallet (on-chain, public):</b>\n" +
        `<code>${OFFICIAL.GIVEBACK_WALLET}</code>`
      : "";
  return (
    "<b>OFFICIAL LINKS</b>\n\nTrust only these channels. Tap a button below.\n\n" +
    `<b>Contract:</b> ${contract}` +
    socialsBlock +
    trustBlock +
    "\n\n<i>Admins never DM first.</i>"
  );
}

export function raidText(): string {
  return (
    "<b>RAID TARGET</b>\n\nAmplify the latest signal on X. Like, repost, reply.\n\n" +
    "<i>Signal Bearers carry the spread.</i>"
  );
}
