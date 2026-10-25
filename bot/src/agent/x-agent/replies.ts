import { OFFICIAL } from "../../content.js";

/**
 * Reply drafts that answer the post they reply to: one concrete, useful line about the risk being discussed plus a
 * free check link. No ticker and no pitch. Replies that only advertise get accounts throttled and convince nobody.
 */

const SITE = OFFICIAL.SITE.replace(/^https?:\/\//, "").replace(/\/$/, "");
const SOL_ADDRESS = /\b[1-9A-HJ-NP-Za-km-z]{32,44}\b/;

const TOPICS: Array<{ match: RegExp; lines: string[] }> = [
  {
    match: /drain|airdrop|claim|connect (your )?wallet|seed phrase|private key/i,
    lines: [
      "Rule of thumb: checking a token never needs your wallet. Anything asking you to connect or sign to \"claim\" is a drainer until proven otherwise. Read-only scan: {link}",
      "Real checks are read-only. If a site wants a signature or your seed phrase to show you something, close the tab. Free scan, no wallet: {link}",
    ],
  },
  {
    match: /honeypot|can'?t sell|cannot sell|unable to sell|sell tax/i,
    lines: [
      "Honeypots usually show up as a blocked sell path or an extreme sell tax, and both are visible before you buy. Free check: {link}",
      "If you can buy but can't sell, it was readable on-chain beforehand: sell simulation, tax, blacklist. 30-second check: {link}",
    ],
  },
  {
    match: /\brug(ged|pull|s)?\b|exit scam|dev (sold|dumped)/i,
    lines: [
      "Most rugs announce themselves before they happen: unlocked LP, live mint authority, one wallet holding a big slice. 30-second check before the next one: {link}",
      "Painful. The usual tells were on-chain before the pull: LP not locked, authorities live, bundled launch wallets. Free scan for the next one: {link}",
    ],
  },
  {
    match: /mint authority|freeze authority|renounce/i,
    lines: [
      "Live mint authority = supply can be printed. Live freeze authority = your tokens can be locked. Both are one lookup away: {link}",
    ],
  },
  {
    match: /liquidity|\bLP\b|locked|burn(ed|t)?/i,
    lines: [
      "The LP lock % matters more than the chart. Unlocked liquidity can leave in one transaction. Checked for you here: {link}",
    ],
  },
  {
    match: /pump\.?fun|new (launch|token)|just launched|stealth|presale|dexscreener/i,
    lines: [
      "New launch checklist: LP locked? Mint and freeze revoked? Top-holder share? Deployer's past tokens? All four in one free scan: {link}",
    ],
  },
];

const GENERIC = [
  "Before buying anything new: LP locked? Mint and freeze revoked? Who holds the top 10%? Free 30-second check, no wallet connect: {link}",
  "Quick sanity check for any token address (authorities, LP lock, holder concentration, deployer history), free: {link}",
  "Worth a scan before anyone apes: verdict plus the exact reasons, free and read-only: {link}",
];

/** A reply for a post whose text (and optional token address) we know; generic when there's no context. */
export function replyText(context: string, seed: number, address?: string): string {
  const addr = address ?? context.match(SOL_ADDRESS)?.[0];
  const link = addr ? `${SITE}/scan/solana-${addr}` : `${SITE}/scan`;
  const lines = TOPICS.find((t) => t.match.test(context))?.lines ?? GENERIC;
  return lines[Math.abs(seed) % lines.length].replace("{link}", link);
}
