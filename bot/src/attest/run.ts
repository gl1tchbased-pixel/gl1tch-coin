import fs from "node:fs";
import { pathToFileURL } from "node:url";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { CircuitBreaker, checkCluster, checkDaily, checkWallet, parseSecretKey, policyFromEnv } from "./guard.js";
import { validateBatch } from "./records.js";
import { recentMemoHints, verifyAnchor, verifyHints } from "./chain.js";
import { anchorBatch, type Audit } from "./sender.js";

/**
 * Attester runner: seals pending Rug Radar sweeps on Solana, one SPL Memo each, then exits. It runs wherever the
 * attester key lives (a scheduled GitHub Actions job, or by hand), never on the bot's host, and trusts nothing
 * the bot sends: every sweep is re-validated and its root recomputed before anything is signed.
 *
 *   ATTESTER_SECRET_KEY   attester secret (base58 or JSON byte array); env only, never logged
 *   ATTESTER_PUBKEY       the published attester address; the run refuses if the key doesn't match it
 *   ATTEST_CLUSTER        devnet | mainnet-beta; no default, so a test setup can't reach mainnet by accident
 *   ATTEST_RPC            RPC URL (defaults to the cluster's public endpoint)
 *   ATTEST_SOURCE         bot base URL serving GET /attest/pending
 *   ATTEST_AUDIT_FILE     optional JSONL copy of the audit log (it is always printed)
 *   ATTEST_MAX_*          optional, can only tighten the policy (see guard.ts)
 *
 * Exit codes: 0 done (or nothing to do), 1 halted by a safety check, 2 misconfigured.
 */

const TOKEN_PROGRAMS = ["TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA", "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"];
const DAY_MS = 86_400_000;
const BACKLOG_MS = 7 * DAY_MS;
const ROOT = /^[0-9a-f]{64}$/;

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
  if (attester.toBase58() !== env.ATTESTER_PUBKEY?.trim()) {
    audit({ step: "config", ok: false, detail: "ATTESTER_PUBKEY is missing or doesn't match the secret key" });
    return 2;
  }
  const policy = policyFromEnv(env);
  const rpc = env.ATTEST_RPC || (cluster === "devnet" ? "https://api.devnet.solana.com" : "https://api.mainnet-beta.solana.com");
  const source = (env.ATTEST_SOURCE || "https://bot.gl1tchbased.xyz").replace(/\/$/, "");
  const conn = new Connection(rpc, "confirmed");
  audit({ step: "start", ok: true, detail: `${cluster} · attester ${attester.toBase58()}` });

  try {
    const wrongChain = checkCluster(cluster, await conn.getGenesisHash());
    if (wrongChain) {
      audit({ step: "config", ok: false, detail: wrongChain });
      return 2;
    }

    // Wallet isolation: a small, fee-only wallet.
    const lamports = await conn.getBalance(attester, "confirmed");
    let tokenAccounts = 0;
    for (const p of TOKEN_PROGRAMS) {
      tokenAccounts += (await conn.getTokenAccountsByOwner(attester, { programId: new PublicKey(p) }, "confirmed")).value.length;
    }
    const badWallet = checkWallet({ lamports, tokenAccounts }, policy);
    if (badWallet) {
      audit({ step: "wallet", ok: false, detail: badWallet });
      return 1;
    }

    // Rolling-24h cap. Memo hints over-count (strangers can copy the text), so they're trusted only to show we're
    // under the cap; at the cap, only transactions the attester really signed are counted.
    const now = Date.now();
    const hints = await recentMemoHints(conn, attester, { commitment: "confirmed", limit: 200 });
    const lastDay = hints.filter((h) => h.blockTime !== null && h.blockTime * 1000 > now - DAY_MS);
    let sentLast24h = lastDay.length;
    if (sentLast24h >= policy.maxPerDay) sentLast24h = (await verifyHints(conn, lastDay, attester, "confirmed")).length;
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
    let budget = Math.min(policy.maxPerRun, policy.maxPerDay - sentLast24h);
    for (const raw of pending) {
      if (budget <= 0 || breaker.open) break;
      const root = (raw as { root?: unknown })?.root;
      const v = validateBatch(raw, { now, maxAgeMs: BACKLOG_MS });
      if (typeof root !== "string" || !ROOT.test(root) || "error" in v) {
        breaker.fail();
        audit({ step: "validate", ok: false, root: typeof root === "string" ? root.slice(0, 64) : undefined, detail: "error" in v ? v.error : "bad root" });
        continue;
      }
      // Idempotent: skip a sweep the attester already sealed (the bot may not have linked it yet).
      let sealed = false;
      for (const h of hints) {
        if (h.root === root && (await verifyAnchor(conn, h.sig, attester, "confirmed"))) {
          sealed = true;
          break;
        }
      }
      if (sealed) {
        audit({ step: "skip", ok: true, root, detail: "already sealed on-chain" });
        continue;
      }
      const r = await anchorBatch(conn, signer, { root, count: v.records.length, sweepMs: v.sweepMs, records: v.records }, policy, breaker, audit);
      if (r.ok) budget--;
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
