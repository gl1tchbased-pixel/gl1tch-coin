import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { AddressInfo } from "node:net";
import { Connection, Keypair, LAMPORTS_PER_SOL, SystemProgram, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
import { createVerifyServer } from "../src/verify/server.js";
import { AttestStore, type ProofEntry } from "../src/attest/store.js";
import { validateBatch } from "../src/attest/records.js";
import { runOnce } from "../src/attest/run.js";
import { linkOnce } from "../src/attest/linker.js";
import { verifyProof } from "../src/attest/merkle.js";
import { CLUSTER_GENESIS } from "../src/attest/guard.js";

/**
 * Devnet end-to-end check for verdict anchoring (A3). A sweep goes into a local bot server, the runner seals it on
 * devnet, a second run must skip it, the linker finds the finalized anchor, and the proof endpoint's proof must
 * verify against the sealed root. Throwaway devnet keys, kept outside the repo. Needs network.
 *
 *   ATTEST_E2E_KEYFILE=/somewhere/attester.json [ATTEST_E2E_FUNDER_KEYFILE=/somewhere/funder.json] npm run attest:e2e
 *
 * The attester is topped up by airdrop, or, when the public faucet is rate-limited, from a funder wallet: the web
 * faucet (faucet.solana.com) sends at least 0.5 SOL, more than the attester's 0.25 SOL cap allows, so it goes to the
 * funder, which forwards 0.1 SOL. Lives outside src/ on purpose: the attester code itself only ever builds memos.
 */

const DEVNET = "https://api.devnet.solana.com";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function loadOrCreate(file: string): Keypair {
  if (fs.existsSync(file)) return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(file, "utf8")) as number[]));
  const kp = Keypair.generate();
  fs.writeFileSync(file, JSON.stringify(Array.from(kp.secretKey)), { mode: 0o600 });
  return kp;
}

async function topUp(conn: Connection, attester: Keypair): Promise<void> {
  if ((await conn.getBalance(attester.publicKey)) >= 0.01 * LAMPORTS_PER_SOL) return;
  try {
    const sig = await conn.requestAirdrop(attester.publicKey, 0.1 * LAMPORTS_PER_SOL);
    await conn.confirmTransaction({ signature: sig, ...(await conn.getLatestBlockhash()) }, "confirmed");
    return;
  } catch (e) {
    console.log(`airdrop refused (${(e as Error).message.slice(0, 80)}); trying the funder wallet`);
  }
  const funderFile = process.env.ATTEST_E2E_FUNDER_KEYFILE;
  if (!funderFile) throw new Error("no devnet SOL: faucet refused and ATTEST_E2E_FUNDER_KEYFILE is not set");
  const funder = loadOrCreate(funderFile);
  if ((await conn.getBalance(funder.publicKey)) < 0.11 * LAMPORTS_PER_SOL) {
    throw new Error(`no devnet SOL: send devnet SOL to the funder ${funder.publicKey.toBase58()} (faucet.solana.com) and rerun`);
  }
  const tx = new Transaction().add(SystemProgram.transfer({ fromPubkey: funder.publicKey, toPubkey: attester.publicKey, lamports: 0.1 * LAMPORTS_PER_SOL }));
  await sendAndConfirmTransaction(conn, tx, [funder], { commitment: "confirmed" });
}

async function main(): Promise<boolean> {
  const conn = new Connection(DEVNET, "confirmed");
  if ((await conn.getGenesisHash()) !== CLUSTER_GENESIS.devnet) throw new Error("RPC is not devnet; refusing");
  const kp = loadOrCreate(process.env.ATTEST_E2E_KEYFILE ?? path.join(os.tmpdir(), "gl1tch-devnet-attester.json"));
  console.log(`attester (devnet, throwaway): ${kp.publicKey.toBase58()}`);
  await topUp(conn, kp);
  console.log(`balance: ${(await conn.getBalance(kp.publicKey)) / LAMPORTS_PER_SOL} SOL`);

  // A local bot with an empty store, wired like production.
  const store = new AttestStore(path.join(os.tmpdir(), `gl1tch-attest-e2e-${Date.now()}.jsonl`));
  const server = createVerifyServer({
    origin: "http://localhost",
    handle: async () => ({ status: 404, body: {} }),
    attest: {
      token: "e2e",
      add: (body) => {
        const v = validateBatch(body, { maxAgeMs: 6 * 3_600_000 });
        return "error" in v ? { ok: false, error: v.error } : { ok: true, ...store.add(v.records, v.sweepMs) };
      },
      info: () => ({}),
      pending: (n) => store.pending(n),
      batch: (r) => store.batch(r) ?? null,
      proof: (c, m) => store.proofs(c, m),
    },
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", () => r()));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  try {
    const sweepMs = Date.now();
    const records = [
      { chain: "solana", mint: "3HQJwwHvzy8pGkPqGQcb4thZCH88MUCHVVSNtHn6pump", verdict: "LOW RISK", score: 88, scannedAt: sweepMs + 1000 },
      { chain: "solana", mint: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263", verdict: "CLEAN", score: 94, scannedAt: sweepMs + 2000 },
      { chain: "solana", mint: "So11111111111111111111111111111111111111112", verdict: "RUG-SHAPED", score: 22, scannedAt: sweepMs + 3000 },
    ];
    const posted = await fetch(`${base}/attest/batch`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-stats-token": "e2e" },
      body: JSON.stringify({ sweepMs, records }),
    }).then((r) => r.json() as Promise<{ ok: boolean; root?: string }>);
    console.log("submitted:", JSON.stringify(posted));

    const env = {
      ATTEST_CLUSTER: "devnet",
      ATTEST_RPC: DEVNET,
      ATTEST_SOURCE: base,
      ATTESTER_PUBKEY: kp.publicKey.toBase58(),
      ATTESTER_SECRET_KEY: JSON.stringify(Array.from(kp.secretKey)),
    };
    const first = await runOnce(env);
    const second = await runOnce(env); // must skip: already sealed, even though the bot hasn't linked it yet
    console.log(`runs exited ${first}, ${second}`);

    const fin = new Connection(DEVNET, "finalized");
    let linked = 0;
    for (let i = 0; i < 24 && !linked; i++) {
      await sleep(5000);
      linked = await linkOnce(fin, kp.publicKey, store);
    }
    const [p] = (await fetch(`${base}/attest/proof?mint=${records[2].mint}`).then((r) => r.json() as Promise<{ proofs?: ProofEntry[] }>)).proofs ?? [];
    const memos = (await conn.getSignaturesForAddress(kp.publicKey, { limit: 3 })).map((s) => s.memo);
    console.log("rpc memo field:", JSON.stringify(memos));
    const sealedOnce = memos.filter((m) => m?.includes(String(posted.root))).length === 1;
    const ok = first === 0 && second === 0 && linked === 1 && sealedOnce && !!p?.anchor?.sig && verifyProof(p.record, p.proof, p.root);
    console.log(`proof for ${records[2].verdict} ${records[2].mint}: root ${p?.root} · tx ${p?.anchor?.sig}`);
    if (p?.anchor?.sig) console.log(`https://explorer.solana.com/tx/${p.anchor.sig}?cluster=devnet`);
    console.log(ok ? "PASS" : "FAIL");
    return ok;
  } finally {
    server.close();
  }
}

main().then(
  (ok) => {
    process.exitCode = ok ? 0 : 1;
  },
  (e) => {
    console.error("e2e failed:", e instanceof Error ? e.message : String(e));
    process.exitCode = 1;
  }
);
