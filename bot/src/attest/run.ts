import fs from "node:fs";
import { pathToFileURL } from "node:url";
import { Connection, Keypair } from "@solana/web3.js";
import nacl from "tweetnacl";
import bs58 from "bs58";
import { CircuitBreaker, checkCluster, checkDaily, checkSigner, checkWallet, linkReportMessage, parseSecretKey, policyFromEnv, runBudget, walletWarnings } from "./guard.js";
import { validateBatch } from "./records.js";
import { VerifyBudget, countSentSince, coversSince, isSealedOnChain, recentMemoHints, verifyAnchor } from "./chain.js";
import { anchorBatch, type Audit } from "./sender.js";

/**
 * Attester runner: seals pending Rug Radar sweeps on Solana, one SPL Memo each, then exits. It runs wherever the
 * attester key lives (a scheduled GitHub Actions job, or by hand), never on the bot's host, and trusts nothing
 * the bot sends: every sweep is re-validated and its root recomputed before anything is signed.
 *
 *   ATTESTER_SECRET_KEY   attester secret (base58 or JSON byte array); env only, never logged
 *   ATTESTER_PUBKEY       the published attester address; the run refuses if the key doesn't match it, and on
 *                         mainnet both must be PINNED_ATTESTER (guard.ts)
 *   ATTEST_CLUSTER        devnet | mainnet-beta; no default, so a test setup can't reach mainnet by accident
 *   ATTEST_RPC            RPC URL (defaults to the cluster's public endpoint)
 *   ATTEST_SOURCE         bot base URL serving GET /attest/pending
 *   ATTEST_AUDIT_FILE     optional JSONL copy of the audit log (it is always printed)
 *   ATTEST_MAX_*          optional, can only tighten the policy (see guard.ts)
 *
 * Exit codes: 0 done (or nothing to do), 1 halted by a safety check, 2 misconfigured.
 */

const DAY_MS = 86_400_000;
const BACKLOG_MS = 7 * DAY_MS;
const ROOT = /^[0-9a-f]{64}$/;
/** Transactions one run may fetch to check hints: enough for the cap count and the "already sealed?" checks, too
 *  few for a flood of copied memos to stall the run (anyone can mint hints). */
const VERIFY_BUDGET = 120;

/**
 * Tells the bot which transaction sealed a sweep, so a flood of copied memos in the attester's history can't keep
 * it unlinked. The report is signed with the attester key (linkReportMessage), so the bot drops forgeries for
 * free; it still verifies the transaction on-chain before linking, and this only saves it the search. Retries
 * while the bot's RPC hasn't seen the transaction yet. Never throws: if the bot can't be reached, its history
 * scan still links the sweep later.
 */
export async function reportAnchor(
  source: string,
  root: string,
  sig: string,
  secretKey: Uint8Array,
  opts: { fetchFn?: typeof fetch; attempts?: number; delayMs?: number } = {}
): Promise<string> {
  if (!/^[1-9A-HJ-NP-Za-km-z]{64,88}$/.test(sig)) return "invalid_sig";
  const fetchFn = opts.fetchFn ?? fetch;
  const proof = bs58.encode(nacl.sign.detached(Buffer.from(linkReportMessage(root, sig), "utf8"), secretKey));
  const attempts = opts.attempts ?? 3;
  let last = "unreachable";
  for (let i = 0; i < attempts; i++) {
    if (i > 0) await new Promise((r) => setTimeout(r, opts.delayMs ?? 5_000));
    try {
      const res = await fetchFn(`${source}/attest/link`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ root, sig, proof }),
        signal: AbortSignal.timeout(10_000),
      });
      const d = (await res.json().catch(() => ({}))) as { result?: unknown };
      last = typeof d.result === "string" ? d.result : `http ${res.status}`;
    } catch {
      last = "unreachable";
    }
    if (last !== "not_found" && last !== "unreachable") return last;
  }
  return last;
}

function makeAudit(file?: string): Audit {
  return (e) => {
    const line = JSON.stringify({ at: new Date().toISOString(), ...e });
    console.log(line);
    if (!file) return;
    try {
      fs.appendFileSync(file, line + "\n");
    } catch {
      console.warn("[attest] audit file write failed");
    }
  };
}

export async function runOnce(env: Record<string, string | undefined> = process.env): Promise<number> {
  const audit = makeAudit(env.ATTEST_AUDIT_FILE);
  const cluster = env.ATTEST_CLUSTER;
  if (cluster !== "devnet" && cluster !== "mainnet-beta") {
    audit({ step: "config", ok: false, detail: "ATTEST_CLUSTER must be devnet or mainnet-beta" });
    return 2;
  }
  let signer: Keypair;
  try {
    signer = Keypair.fromSecretKey(parseSecretKey(env.ATTESTER_SECRET_KEY));
  } catch (e) {
    audit({ step: "config", ok: false, detail: (e as Error).message });
    return 2;
  }
  const attester = signer.publicKey;
  const wrongSigner = checkSigner(cluster, attester.toBase58(), env.ATTESTER_PUBKEY);
  if (wrongSigner) {
    audit({ step: "config", ok: false, detail: wrongSigner });
    return 2;
  }
  const policy = policyFromEnv(env);
  const rpc = env.ATTEST_RPC || (cluster === "devnet" ? "https://api.devnet.solana.com" : "https://api.mainnet-beta.solana.com");
  const source = (env.ATTEST_SOURCE || "https://bot.gl1tchbased.xyz").replace(/\/$/, "");
  const conn = new Connection(rpc, "confirmed");
  // Hint checks only: a 429 throws (counted as "unknown") instead of being slept through, so a rate-limiting RPC
  // can't push the run past its job timeout. Sending and confirming keep web3.js's normal retries.
  const verifyConn = new Connection(rpc, { commitment: "confirmed", disableRetryOnRateLimit: true });
  audit({ step: "start", ok: true, detail: `${cluster} · attester ${attester.toBase58()}` });

  try {
    const wrongChain = checkCluster(cluster, await conn.getGenesisHash());
    if (wrongChain) {
      audit({ step: "config", ok: false, detail: wrongChain });
      return 2;
    }

    // Wallet: enough SOL to pay, and not far more than a fee wallet should hold. Which wallet it is was settled by
    // the pinned signer above; token accounts aren't read at all (anyone can open one or send it dust).
    const lamports = await conn.getBalance(attester, "confirmed");
    const badWallet = checkWallet({ lamports }, policy);
    if (badWallet) {
      audit({ step: "wallet", ok: false, detail: badWallet });
      return 1;
    }
    for (const w of walletWarnings({ lamports }, policy)) audit({ step: "wallet", ok: true, detail: w });

    // History back to the backlog start. Anyone can put the attester in a transaction, so if a flood keeps us
    // from reading back that far, the run degrades to one anchor (see runBudget) instead of trusting the count.
    const now = Date.now();
    const history = await recentMemoHints(conn, attester, { commitment: "confirmed", sinceMs: now - BACKLOG_MS });
    const { hints } = history;
    if (!history.complete) audit({ step: "history", ok: true, detail: "attester history flooded past the read limit" });
    const verify = new VerifyBudget((sig) => verifyAnchor(verifyConn, sig, attester, "confirmed"), VERIFY_BUDGET);

    // Rolling-24h cap. Memo hints over-count (strangers can copy the text), so they're trusted only to show we're
    // under the cap; at the cap, only transactions the attester really signed are counted, within the verify
    // budget. A hint without a block time counts as recent.
    const lastDay = hints.filter((h) => h.blockTime === null || h.blockTime * 1000 > now - DAY_MS);
    let sentLast24h = lastDay.length;
    let countExact = true;
    if (sentLast24h >= policy.maxPerDay) {
      const c = await countSentSince(lastDay, verify, policy.maxPerDay);
      sentLast24h = c.count;
      countExact = c.exact;
    }
    const capped = checkDaily(sentLast24h, policy);
    if (capped) {
      audit({ step: "daily", ok: true, detail: capped });
      return 0;
    }

    const res = await fetch(`${source}/attest/pending?limit=${policy.maxPerRun * 2}`, { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) throw new Error(`source answered ${res.status}`);
    const body = (await res.json()) as { batches?: unknown };
    const pending = Array.isArray(body.batches) ? body.batches : [];
    audit({ step: "pending", ok: true, detail: `${pending.length} sweep(s) waiting, ${sentLast24h} sealed in 24h` });

    const breaker = new CircuitBreaker(policy.maxConsecutiveFailures);
    // A day not fully read, or a count the budget couldn't settle, drops the run to one anchor (see runBudget).
    const dayKnown = coversSince(history, now - DAY_MS) && countExact;
    if (!dayKnown) audit({ step: "budget", ok: true, detail: "the last 24h couldn't be fully read or counted; one anchor this run" });
    let budget = runBudget({ sentLast24h, historyComplete: dayKnown }, policy);
    for (const raw of pending) {
      if (budget <= 0 || breaker.open) break;
      const root = (raw as { root?: unknown })?.root;
      const v = validateBatch(raw, { now, maxAgeMs: BACKLOG_MS });
      if (typeof root !== "string" || !ROOT.test(root) || "error" in v) {
        breaker.fail();
        audit({ step: "validate", ok: false, root: typeof root === "string" ? root.slice(0, 64) : undefined, detail: "error" in v ? v.error : "bad root" });
        continue;
      }
      // Idempotent: skip a sweep the attester already sealed (the bot may not have linked it yet). Only a few copies
      // of a root are checked, within the run's verify budget; past that it is sealed again (one extra fee) rather
      // than skipped, so copies of its memo can't block a sweep.
      if (await isSealedOnChain(root, hints, verify)) {
        audit({ step: "skip", ok: true, root, detail: "already sealed on-chain" });
        continue;
      }
      const r = await anchorBatch(conn, signer, { root, count: v.records.length, sweepMs: v.sweepMs, records: v.records }, policy, breaker, audit);
      if (r.ok) {
        budget--;
        const reported = await reportAnchor(source, root, r.sig, signer.secretKey);
        audit({ step: "report", ok: reported === "queued", root, sig: r.sig, detail: reported });
      }
    }
    if (breaker.open) {
      audit({ step: "halt", ok: false, detail: `circuit breaker opened after ${policy.maxConsecutiveFailures} consecutive failures` });
      return 1;
    }
    return 0;
  } catch (e) {
    audit({ step: "rpc", ok: false, detail: (e instanceof Error ? e.message : String(e)).slice(0, 200) });
    return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runOnce().then(
    (code) => {
      process.exitCode = code;
    },
    (e) => {
      console.error("[attest] run failed:", e instanceof Error ? e.message : String(e));
      process.exitCode = 1;
    }
  );
}
