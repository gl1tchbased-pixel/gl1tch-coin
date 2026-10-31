import { PublicKey } from "@solana/web3.js";

/**
 * Pure rules for the money watch: what must be true about where GL1TCH's money flows, and when to tell the founder.
 * Runs on the bot's server, outside Vercel, so a hijacked site or a changed Vercel setting can't silence it. It only
 * reads and alerts. It holds no key and can't move or stop anything.
 */

export interface Problem {
  id: string;
  text: string;
}

export const PINS = {
  /** Who must own the referral accounts. Matches REFERRAL_PARTNER in src/lib/official.ts (a test keeps them equal). */
  partner: "AZSFHxHZaA2eqocJ1V9iwuRh6vW6Kt5ms12b6za6QrNb",
  referrals: [
    { label: "Ultra", address: "J4T8vmahpgiGmjkDXTaacVSAw9iQxgP7P81PCS31PsDB", project: "DkiqsTrw1u1bYFumumC7sCG2S8K25qc2vemJFHyW2wJc", shareBps: 8000 },
    { label: "Classic", address: "EFP5EHXwkBScaVwCkBHkr9sc2wYsKRathmB1zJmfhpS2", project: "45ruCyfdRkWpRNGEqWzjCiXRHkZs8WXCLQ67Pnpye7Hp", shareBps: 10000 },
  ],
  /** The live fee vault (the Ultra account's WSOL associated token account). */
  vault: "DqKd8TtLf9m8dkg81K6XNVg5CGB9uMHVSQKQn9qNjYTU",
  payToSolana: "H5qbtquJzLVrwYj5opedoQCy9edQQZAtiyPMTMFFaFb4",
  payToBase: "0xbE1e88C07a080078629f793013597E43183F6Dca",
} as const;

export function referralProblems(pin: (typeof PINS.referrals)[number], data: Uint8Array | null, partner: string = PINS.partner): Problem[] {
  const id = `referral:${pin.label}`;
  if (!data) return [{ id, text: `${pin.label} referral hesabı zincirde yok.` }];
  if (data.length < 74) return [{ id, text: `${pin.label} referral hesabı okunamadı.` }];
  const owner = new PublicKey(data.subarray(8, 40)).toBase58();
  const project = new PublicKey(data.subarray(40, 72)).toBase58();
  const shareBps = new DataView(data.buffer, data.byteOffset).getUint16(72, true);
  const problems: Problem[] = [];
  if (owner !== partner) problems.push({ id: `${id}:owner`, text: `${pin.label} kasasının SAHİBİ DEĞİŞTİ. Şu an: ${owner}. Olması gereken: ${partner}.` });
  if (project !== pin.project) problems.push({ id: `${id}:project`, text: `${pin.label} referral hesabı başka projeye bağlı: ${project}.` });
  if (shareBps < pin.shareBps) problems.push({ id: `${id}:share`, text: `${pin.label} payımız düşürüldü: %${shareBps / 100} (olması gereken %${pin.shareBps / 100}).` });
  return problems;
}

export interface TokenAccountInfo {
  owner?: string;
  delegate?: string;
  closeAuthority?: string;
}

/** An absent vault isn't a problem (no fee flows). An open one must belong to the referral account, with no one else's hand on it. */
export function vaultProblems(info: TokenAccountInfo | null): Problem[] {
  if (!info) return [];
  const problems: Problem[] = [];
  const referral = PINS.referrals[0].address;
  if (info.owner !== referral) problems.push({ id: "vault:owner", text: `Ücret kasasının sahibi referral hesabı değil: ${info.owner}.` });
  if (info.delegate) problems.push({ id: "vault:delegate", text: `Ücret kasasına harcama yetkisi verilmiş: ${info.delegate}.` });
  if (info.closeAuthority && info.closeAuthority !== referral) problems.push({ id: "vault:close", text: `Ücret kasasını kapatma yetkisi başkasında: ${info.closeAuthority}.` });
  return problems;
}

/** Another wallet allowed to spend the treasury's tokens is how a signed-away approval looks. */
export function delegateProblems(label: string, accounts: TokenAccountInfo[]): Problem[] {
  return accounts.filter((a) => a.delegate).map((a) => ({ id: `delegate:${label}:${a.delegate}`, text: `${label} hesabında harcama yetkisi verilmiş: ${a.delegate}.` }));
}

/** `undefined` status or payTo means the site didn't answer: not this watch's business, the site monitor covers uptime. */
export function siteProblems(site: { signingPages: Record<string, number | undefined>; payTo?: string[] }): Problem[] {
  const problems: Problem[] = [];
  for (const [page, status] of Object.entries(site.signingPages)) {
    if (status !== undefined && status !== 404) problems.push({ id: `site:${page}`, text: `İmza isteyen sayfa canlıda: ${page} (durum ${status}).` });
  }
  const allowed: string[] = [PINS.payToSolana, PINS.payToBase];
  for (const address of site.payTo ?? []) {
    if (!allowed.includes(address)) problems.push({ id: `site:payTo:${address}`, text: `x402 ödemesi BAŞKA ADRESE yönleniyor: ${address}.` });
  }
  return problems;
}

/** Keep the attester's small memo fees from alerting. */
const DROP_TOLERANCE: Record<string, number> = { SOL: 0.005, USDC: 0.01, GL1TCH: 0 };

export type Balances = Record<string, number>;

/** One message per balance that fell since the last look. Keys look like "Deployer SOL". */
export function balanceDrops(previous: Balances, next: Balances): string[] {
  const out: string[] = [];
  for (const [key, now] of Object.entries(next)) {
    const before = previous[key];
    if (before === undefined) continue;
    const tolerance = DROP_TOLERANCE[key.split(" ").pop() ?? ""] ?? 0;
    if (before - now > tolerance) out.push(`${key} azaldı: ${before} -> ${now}.`);
  }
  return out;
}

export const REPEAT_MS = 6 * 60 * 60 * 1000;

export interface AlertState {
  /** Problem id to the last time it was sent. */
  open: Record<string, number>;
}

/** New problems go out now, open ones again every 6 hours, and a cleared one says so once. */
export function planAlerts(state: AlertState, problems: Problem[], now: number): { messages: string[]; state: AlertState } {
  const messages: string[] = [];
  const open: Record<string, number> = {};
  for (const problem of problems) {
    const lastSent = state.open[problem.id];
    if (lastSent === undefined || now - lastSent >= REPEAT_MS) {
      messages.push(problem.text);
      open[problem.id] = now;
    } else {
      open[problem.id] = lastSent;
    }
  }
  for (const id of Object.keys(state.open)) {
    if (!(id in open)) messages.push(`Düzeldi: ${id}`);
  }
  return { messages, state: { open } };
}
