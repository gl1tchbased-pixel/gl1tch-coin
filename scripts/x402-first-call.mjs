#!/usr/bin/env node
/**
 * First paid calls to the GL1TCH x402 API, from a throwaway test wallet. They prove the live payment
 * path end to end and get the endpoints listed in x402 catalogs (catalogs list a resource after its
 * first settlement). These payments are ours, so the wallet's pubkey goes in X402_SELF_PAYERS and
 * they never count as revenue.
 *
 *   node scripts/x402-first-call.mjs init
 *       Creates e2e/x402/test-wallet.json (gitignored) if missing and prints ONLY the pubkey.
 *   node scripts/x402-first-call.mjs where
 *       Prints where the wallet file lives.
 *   node scripts/x402-first-call.mjs run --pay-to <revenue Solana address> [--base https://gl1tchbased.xyz] [--routes scan,radar]
 *       Pays each paid endpoint once (all six: $0.036 USDC on Solana; the facilitator pays the SOL fee).
 *
 * Guards: pays only on Solana mainnet, only to --pay-to, at most $0.01 per call; refuses to run if the
 * wallet holds more than 1 USDC or the revenue wallet has no USDC token account yet. Every call is
 * marked x-gl1tch-self-test: 1 so it never counts as revenue. The secret key is never printed.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";
import { createKeyPairSignerFromPrivateKeyBytes } from "@solana/kit";
import { x402Client, wrapFetchWithPayment, decodePaymentResponseHeader } from "@x402/fetch";
import { registerExactSvmScheme } from "@x402/svm/exact/client";
import { toClientSvmSigner } from "@x402/svm";

// Resolved from this file, not the working directory, so the secret always lands in the gitignored
// e2e/x402/ (X402_TEST_WALLET overrides it, for tests).
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const WALLET_FILE = process.env.X402_TEST_WALLET || join(ROOT, "e2e", "x402", "test-wallet.json");
const SELF_TEST_HEADER = { "x-gl1tch-self-test": "1" };
const SOLANA_MAINNET = "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp";
const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const RPC = process.env.SOLANA_RPC || "https://api.mainnet-beta.solana.com";
const MAX_MICRO_PER_CALL = 10_000; // $0.01
const MAX_WALLET_MICRO = 1_000_000; // refuse to run with more than 1 USDC in the test wallet

const BONK = "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263";
const ATTESTER = "BSq18aJBhxYJgeEbcA3jGQNU1vmwZdo2PQkkpVsK7W6o";
/** One call per paid route. A Bazaar listing refreshes its metadata only when a payment settles, so
 *  after a description change every route is paid once. `--routes scan,radar` limits the run. */
const ALL_CALLS = {
  scan: `/api/x402/scan?mint=${BONK}&chain=solana`,
  agent: `/api/x402/agent?address=${ATTESTER}`,
  deployer: `/api/x402/deployer?address=${ATTESTER}`,
  verdict: `/api/x402/verdict?mint=${BONK}&chain=solana`,
  radar: `/api/x402/radar`,
  random: `/api/x402/random?min=1&max=100`,
};
const ROUTES = (arg("--routes") || Object.keys(ALL_CALLS).join(",")).split(",").map((r) => r.trim()).filter(Boolean);
for (const r of ROUTES) if (!(r in ALL_CALLS)) throw new Error(`unknown route "${r}" (known: ${Object.keys(ALL_CALLS).join(", ")})`);
const CALLS = ROUTES.map((r) => ALL_CALLS[r]);

function arg(name) {
  const i = process.argv.indexOf(name);
  return i > 0 ? process.argv[i + 1] : undefined;
}

async function loadSigner() {
  if (!existsSync(WALLET_FILE)) throw new Error(`no test wallet yet — run: node scripts/x402-first-call.mjs init`);
  const { seed } = JSON.parse(readFileSync(WALLET_FILE, "utf8"));
  return createKeyPairSignerFromPrivateKeyBytes(Uint8Array.from(Buffer.from(seed, "hex")));
}

/** The owner's USDC token accounts: how many, and the total in micro-USDC. */
async function usdcAccounts(owner) {
  const r = await fetch(RPC, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getTokenAccountsByOwner", params: [owner, { mint: USDC }, { encoding: "jsonParsed" }] }),
  });
  const d = await r.json();
  if (d.error) throw new Error(`RPC: ${d.error.message}`);
  const micro = d.result.value.reduce((sum, a) => sum + Number(a.account.data.parsed.info.tokenAmount.amount), 0);
  return { count: d.result.value.length, micro };
}

async function init() {
  if (!existsSync(WALLET_FILE)) {
    mkdirSync(dirname(WALLET_FILE), { recursive: true });
    writeFileSync(WALLET_FILE, JSON.stringify({ seed: randomBytes(32).toString("hex") }), { mode: 0o600 });
  }
  const signer = await loadSigner();
  console.log(`test wallet pubkey: ${signer.address}`);
  console.log(`set X402_SELF_PAYERS=${signer.address} in Vercel, then send ~0.10 USDC (Solana) to it.`);
}

async function run() {
  const payTo = arg("--pay-to");
  const base = (arg("--base") || "https://gl1tchbased.xyz").replace(/\/$/, "");
  if (!payTo) throw new Error("--pay-to <revenue Solana address> is required (the script pays no one else)");

  const signer = await loadSigner();
  const { micro: balance } = await usdcAccounts(signer.address);
  console.log(`test wallet ${signer.address}: ${(balance / 1e6).toFixed(6)} USDC`);
  if (balance > MAX_WALLET_MICRO) throw new Error("test wallet holds more than 1 USDC — move the excess out first");
  if (balance < CALLS.length * MAX_MICRO_PER_CALL) throw new Error("not enough USDC for the calls — fund it with ~0.10 USDC");
  // An x402 payment is a plain USDC transfer into the receiver's existing token account; it never
  // creates one. Without it every Solana payment fails verification.
  if ((await usdcAccounts(payTo)).count === 0) {
    throw new Error(`revenue wallet ${payTo} has no USDC token account yet — send it any amount of USDC on Solana first (that creates it), then rerun`);
  }

  const onlyOurs = (_version, reqs) =>
    reqs.filter((r) => r.network === SOLANA_MAINNET && r.payTo === payTo && r.asset === USDC && Number(r.amount) <= MAX_MICRO_PER_CALL);
  const client = registerExactSvmScheme(new x402Client(), { signer: toClientSvmSigner(signer), networks: [SOLANA_MAINNET], policies: [onlyOurs] });
  const pay = wrapFetchWithPayment(fetch, client);

  for (const path of CALLS) {
    const res = await pay(`${base}${path}`, { headers: SELF_TEST_HEADER });
    const header = res.headers.get("payment-response");
    const settle = header ? decodePaymentResponseHeader(header) : null;
    const body = await res.json().catch(() => ({}));
    const summary =
      body.verdict ??
      body.level ??
      body.reputation?.level ??
      (Array.isArray(body.values) ? `values ${body.values.join(",")}` : undefined) ??
      (typeof body.scanned === "number" ? `${body.scanned} scanned` : undefined) ??
      body.error ??
      "";
    console.log(`${res.status} ${path.split("?")[0]} → ${summary} | tx: ${settle?.transaction ?? "none"}`);
  }
  console.log(`done. Check ${base}/revenue — these rows must show as "self-test · not counted".`);
}

const cmd = process.argv[2];
const where = async () => console.log(WALLET_FILE);
const main = cmd === "init" ? init : cmd === "run" ? run : cmd === "where" ? where : null;
if (!main) {
  console.log("usage: node scripts/x402-first-call.mjs init | where | run --pay-to <address> [--base <origin>]");
  process.exit(1);
}
main().catch((e) => {
  console.error(`error: ${e.message}`);
  // exitCode, not exit(): exiting with fetch sockets still open crashes Node on Windows.
  process.exitCode = 1;
});
