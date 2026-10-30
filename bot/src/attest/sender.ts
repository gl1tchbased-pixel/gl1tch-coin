import {
  PublicKey,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
  type Connection,
  type Keypair,
} from "@solana/web3.js";
import { memoText, merkleRoot, type VerdictRecord } from "./merkle.js";
import { shapeOf } from "./chain.js";
import {
  MEMO_PROGRAM_ID,
  checkAnchorTx,
  checkFee,
  checkSimulation,
  type AttestPolicy,
  type CircuitBreaker,
} from "./guard.js";

export interface AuditEntry {
  step: string;
  ok: boolean;
  root?: string;
  sig?: string;
  detail?: string;
}
export type Audit = (e: AuditEntry) => void;

export interface BatchToAnchor {
  root: string;
  count: number;
  sweepMs: number;
  records: VerdictRecord[];
}

/**
 * Anchors one sweep: one transaction holding one memo, signed by the attester. Each step refuses on its own: the
 * root is recomputed from the records, the compiled message is checked against the allowlist, the fee is capped,
 * and the exact signed bytes are simulated (balance change capped) before those same bytes are sent.
 * Every refusal counts against the circuit breaker and every step is audit-logged.
 */
export async function anchorBatch(
  conn: Connection,
  signer: Keypair,
  batch: BatchToAnchor,
  policy: AttestPolicy,
  breaker: CircuitBreaker,
  audit: Audit
): Promise<{ ok: true; sig: string } | { ok: false; reason: string }> {
  if (breaker.open) {
    audit({ step: "breaker", ok: false, root: batch.root, detail: "circuit breaker is open" });
    return { ok: false, reason: "circuit breaker is open" };
  }
  const refuse = (step: string, reason: string) => {
    breaker.fail();
    audit({ step, ok: false, root: batch.root, detail: reason });
    return { ok: false as const, reason };
  };

  let root: string;
  try {
    root = merkleRoot(batch.records);
  } catch (e) {
    return refuse("root", (e as Error).message);
  }
  if (root !== batch.root || batch.count !== batch.records.length) return refuse("root", "root or count doesn't match the records");
  const memo = memoText(root, batch.count, batch.sweepMs);
  const attester = signer.publicKey;

  try {
    const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash("confirmed");
    const msg = new TransactionMessage({
      payerKey: attester,
      recentBlockhash: blockhash,
      instructions: [new TransactionInstruction({ programId: new PublicKey(MEMO_PROGRAM_ID), keys: [], data: Buffer.from(memo, "utf8") })],
    }).compileToLegacyMessage();

    const notAllowed = checkAnchorTx(shapeOf(msg), attester.toBase58(), memo);
    if (notAllowed) return refuse("allowlist", notAllowed);

    const fee = (await conn.getFeeForMessage(msg, "confirmed")).value;
    const feeTooHigh = checkFee(fee, policy);
    if (feeTooHigh) return refuse("fee", feeTooHigh);

    const tx = new VersionedTransaction(msg);
    tx.sign([signer]);
    const pre = await conn.getBalance(attester, "confirmed");
    const sim = await conn.simulateTransaction(tx, {
      sigVerify: true,
      commitment: "confirmed",
      accounts: { encoding: "base64", addresses: [attester.toBase58()] },
    });
    const badSim = checkSimulation(
      { err: sim.value.err, preLamports: pre, postLamports: sim.value.accounts?.[0]?.lamports ?? null },
      policy
    );
    if (badSim) {
      const logs = sim.value.logs?.length ? ` (logs: ${sim.value.logs.slice(-3).join(" | ")})` : "";
      return refuse("simulate", `${badSim}${logs}`);
    }

    const sig = await conn.sendRawTransaction(tx.serialize(), { skipPreflight: false, preflightCommitment: "confirmed", maxRetries: 3 });
    audit({ step: "sent", ok: true, root, sig, detail: `fee ${fee} lamports` });
    const conf = await conn.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, "confirmed");
    if (conf.value.err) return refuse("confirm", JSON.stringify(conf.value.err).slice(0, 200));
    breaker.ok();
    audit({ step: "confirmed", ok: true, root, sig });
    return { ok: true, sig };
  } catch (e) {
    return refuse("rpc", (e instanceof Error ? e.message : String(e)).slice(0, 200));
  }
}
