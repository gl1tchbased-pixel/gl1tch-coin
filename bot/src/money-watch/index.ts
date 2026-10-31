import type { Api } from "grammy";
import { config } from "../config.js";
import { safeReadJson, safeWriteJson } from "../lib/safe-io.js";
import {
  PINS,
  balanceDrops,
  delegateProblems,
  planAlerts,
  referralProblems,
  siteProblems,
  vaultProblems,
  type AlertState,
  type Balances,
  type Problem,
  type TokenAccountInfo,
} from "./check.js";

const TICK_MS = 5 * 60 * 1000;
/** About an hour of failed reads: a blind watch is worth telling the founder about. */
const BLIND_AFTER = 12;
const STATE_PATH = `${process.env.RAILWAY_VOLUME_MOUNT_PATH ?? "/tmp"}/gl1tch-money-watch.json`;
const SITE = "https://gl1tchbased.xyz";
const SIGNING_PAGES = ["/revenue/setup", "/api/actions/init-referral"];
const MINTS = { USDC: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", GL1TCH: "3HQJwwHvzy8pGkPqGQcb4thZCH88MUCHVVSNtHn6pump" };

interface Saved extends AlertState {
  balances: Balances;
  started?: boolean;
}

async function rpc<T>(method: string, params: unknown[]): Promise<T> {
  const res = await fetch(config.verify.rpcUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    signal: AbortSignal.timeout(15_000),
  });
  const json = (await res.json()) as { result?: T; error?: unknown };
  if (json.result === undefined) throw new Error(`${method}: ${JSON.stringify(json.error)}`);
  return json.result;
}

interface ParsedTokenAccount {
  data: { parsed?: { info?: TokenAccountInfo & { tokenAmount?: { uiAmount?: number } } } };
}

async function readChain(): Promise<{ problems: Problem[]; balances: Balances }> {
  const addresses = [...PINS.referrals.map((r) => r.address), PINS.vault];
  const accounts = await rpc<{ value: Array<{ data: [string, string] | ParsedTokenAccount["data"] } | null> }>("getMultipleAccounts", [addresses, { encoding: "jsonParsed" }]);
  const problems: Problem[] = [];
  PINS.referrals.forEach((pin, i) => {
    const data = accounts.value[i]?.data;
    problems.push(...referralProblems(pin, Array.isArray(data) ? Buffer.from(data[0], "base64") : null));
  });
  const vault = accounts.value[PINS.referrals.length]?.data;
  problems.push(...vaultProblems(vault && !Array.isArray(vault) ? (vault.parsed?.info ?? null) : null));

  const balances: Balances = {};
  balances["Deployer SOL"] = (await rpc<{ value: number }>("getBalance", [PINS.payToSolana])).value / 1e9;
  balances["Kasa sahibi SOL"] = (await rpc<{ value: number }>("getBalance", [PINS.partner])).value / 1e9;
  for (const [name, mint] of Object.entries(MINTS)) {
    const owned = await rpc<{ value: Array<{ account: ParsedTokenAccount }> }>("getTokenAccountsByOwner", [PINS.payToSolana, { mint }, { encoding: "jsonParsed" }]);
    const infos = owned.value.map((a) => a.account.data.parsed?.info ?? {});
    balances[`Deployer ${name}`] = infos.reduce((sum, info) => sum + (info.tokenAmount?.uiAmount ?? 0), 0);
    problems.push(...delegateProblems(`Deployer ${name}`, infos));
  }
  return { problems, balances };
}

const statusOf = (path: string) =>
  fetch(`${SITE}${path}`, { redirect: "manual", signal: AbortSignal.timeout(15_000) })
    .then((r) => (r.status >= 500 ? undefined : r.status))
    .catch(() => undefined);

async function readLivePayTo(): Promise<string[] | undefined> {
  try {
    // The self-test header keeps this probe out of the found-versus-bought ledger.
    const res = await fetch(`${SITE}/api/x402/quick`, { headers: { "x-gl1tch-self-test": "1" }, signal: AbortSignal.timeout(15_000) });
    const header = res.headers.get("payment-required");
    if (res.status !== 402 || !header) return undefined;
    const challenge = JSON.parse(Buffer.from(header, "base64").toString("utf8")) as { accepts?: Array<{ payTo?: string }> };
    return (challenge.accepts ?? []).flatMap((a) => (a.payTo ? [a.payTo] : []));
  } catch {
    return undefined;
  }
}

async function readSite(): Promise<Problem[]> {
  const statuses = await Promise.all(SIGNING_PAGES.map(statusOf));
  return siteProblems({
    signingPages: Object.fromEntries(SIGNING_PAGES.map((page, i) => [page, statuses[i]])),
    payTo: await readLivePayTo(),
  });
}

async function tell(api: Api, text: string): Promise<void> {
  for (const id of config.adminIds) {
    try {
      await api.sendMessage(id, text);
    } catch (e) {
      console.error(`[money-watch] alert failed admin=${id}:`, (e as Error).message);
    }
  }
}

export function startMoneyWatch(api: Api): void {
  const saved = safeReadJson<Saved>(STATE_PATH, "money-watch");
  let state: Saved = saved ?? { open: {}, balances: {} };
  let failures = 0;

  const tick = async () => {
    const messages: string[] = [];
    let problems: Problem[];
    try {
      const chain = await readChain();
      problems = [...chain.problems, ...(await readSite())];
      messages.push(...balanceDrops(state.balances, chain.balances));
      state.balances = chain.balances;
      failures = 0;
    } catch (e) {
      failures += 1;
      console.warn(`[money-watch] read failed (${failures}):`, (e as Error).message);
      if (failures === BLIND_AFTER) await tell(api, "🚨 Para gözcüsü: yaklaşık 1 saattir zinciri okuyamıyorum. Şu an kör durumdayım.");
      return;
    }
    const plan = planAlerts(state, problems, Date.now());
    messages.push(...plan.messages);
    state = { ...state, open: plan.state.open };
    if (!state.started) {
      state.started = true;
      messages.unshift(`Para gözcüsü açıldı. 5 dakikada bir kasayı, ödeme adreslerini ve siteyi kontrol ediyorum. Şu anki sorun sayısı: ${problems.length}.`);
    }
    safeWriteJson(STATE_PATH, state);
    if (messages.length > 0) await tell(api, `🚨 GL1TCH para gözcüsü\n\n${messages.join("\n")}\n\nBunu sen yapmadıysan: docs/security/treasury-runbook.md`);
    console.log(`[money-watch] checked: ${problems.length} problem(s), ${messages.length} message(s)`);
  };

  void tick();
  setInterval(() => void tick(), TICK_MS).unref?.();
}
