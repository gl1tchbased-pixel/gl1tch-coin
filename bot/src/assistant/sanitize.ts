import { OFFICIAL } from "../content.js";

/**
 * Last line of defence between the model and a group of people holding wallets. Anyone can talk to the bot, so
 * anyone can try to make it say "the new contract is X" or post a drainer link. Whatever the model was talked
 * into, only known links, handles and addresses get through. Replies go out as plain text, never HTML.
 */

const MAX_CHARS = 1500;

// A bare host also covers its subdomains. An entry with a path covers only that path.
const ALLOWED_LINKS = [
  "gl1tchbased.xyz",
  "github.com/gl1tchbased-pixel",
  "x.com/gl1tchbased",
  "twitter.com/gl1tchbased",
  "t.me/gl1tch_infected",
  "t.me/gl1tch_infected_bot",
  "instagram.com/gl1tch_infected",
  "reddit.com/user/gl1tch_infected",
  "rugcheck.xyz",
  "solscan.io",
  "solsniffer.com",
  "dexscreener.com",
  "geckoterminal.com",
  `pump.fun/coin/${OFFICIAL.CONTRACT}`,
].map((l) => l.toLowerCase());

const ALLOWED_HANDLES = new Set(["gl1tchbased", "gl1tch_infected", "gl1tch_infected_bot"]);

const URL_RE =
  /(?:https?:\/\/[^\s)\]>"']+|\b(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:com|io|xyz|org|net|app|fun|gg|me|co|ai|finance|site|online|top|info|live|pro|link|click|to|so|sh|dev|cc|vip|club|tech|shop|store|ru|cn|tr)\b(?:\/[^\s)\]>"']*)?)/gi;
const ADDRESS_RE = /\b(?:0x[0-9a-fA-F]{40}|[1-9A-HJ-NP-Za-km-z]{32,44})\b/g;
const HANDLE_RE = /(^|[^\w@])@([A-Za-z0-9_]{4,32})/g;

function linkAllowed(url: string): boolean {
  const bare = url.replace(/^https?:\/\//i, "").replace(/^www\./i, "").toLowerCase();
  const m = /^([^/?#]+)(.*)$/.exec(bare);
  if (!m) return false;
  const [, host, rest] = m;
  return ALLOWED_LINKS.some((allowed) => {
    const slash = allowed.indexOf("/");
    if (slash < 0) return host === allowed || host.endsWith(`.${allowed}`);
    const path = allowed.slice(slash);
    return host === allowed.slice(0, slash) && (rest === path || rest.startsWith(`${path}/`) || rest.startsWith(`${path}?`));
  });
}

function filterLink(found: string): string {
  // "see gl1tchbased.xyz." ends a sentence, the dot isn't part of the link.
  const url = found.replace(/[.,;:!?]+$/, "");
  return (linkAllowed(url) ? url : "[link removed]") + found.slice(url.length);
}

/** Addresses the bot may repeat: ours, plus any the asker or the scanner already put on the table. */
export function allowedAddresses(...sources: string[]): Set<string> {
  const out = new Set<string>([OFFICIAL.CONTRACT, OFFICIAL.GIVEBACK_WALLET]);
  for (const s of sources) for (const a of s.match(ADDRESS_RE) ?? []) out.add(a);
  return out;
}

export function sanitizeReply(raw: string, addresses: Set<string>): string {
  const text = raw
    .replace(/\[([^\]]*)\]\(([^)]*)\)/g, "$1 $2") // markdown link -> visible text + visible url
    .replace(/\*\*|__|`/g, "")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(URL_RE, filterLink)
    .replace(ADDRESS_RE, (a) => (addresses.has(a) ? a : "[address removed]"))
    .replace(HANDLE_RE, (all, pre: string, h: string) => (ALLOWED_HANDLES.has(h.toLowerCase()) ? all : `${pre}[handle removed]`))
    .trim();
  return text.length <= MAX_CHARS ? text : text.slice(0, MAX_CHARS - 1).trimEnd() + "…";
}

/** The model signals "not for me" with SKIP. It sometimes adds punctuation. */
export const isSkip = (raw: string): boolean => /^\W*skip\W*$/i.test(raw.trim());
