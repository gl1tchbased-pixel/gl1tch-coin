import { describe, it, expect } from "vitest";
import {
  ComputeBudgetProgram,
  Keypair,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import { swapTxProblem } from "./swap-tx-check";

const taker = Keypair.generate().publicKey;
const thief = Keypair.generate().publicKey;
const TOKEN = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const JUP6 = new PublicKey("JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4");
const LAMPORTS = 100_000_000;

function build(instructions: TransactionInstruction[], payer: PublicKey = taker): string {
  const message = new TransactionMessage({ payerKey: payer, recentBlockhash: "11111111111111111111111111111111", instructions }).compileToV0Message();
  return Buffer.from(new VersionedTransaction(message).serialize()).toString("base64");
}
const check = (tx: string) => swapTxProblem(tx, { taker: taker.toBase58(), lamports: LAMPORTS });
const tokenIx = (code: number, keys: PublicKey[]) =>
  new TransactionInstruction({ programId: TOKEN, keys: keys.map((pubkey) => ({ pubkey, isSigner: false, isWritable: true })), data: Buffer.from([code]) });
const wrap = (lamports = LAMPORTS) => SystemProgram.transfer({ fromPubkey: taker, toPubkey: Keypair.generate().publicKey, lamports });
const route = new TransactionInstruction({ programId: JUP6, keys: [], data: Buffer.from([1, 2, 3]) });

describe("swapTxProblem", () => {
  it("passes the shape Jupiter really returns: wrap, route, unwrap", () => {
    const wsol = Keypair.generate().publicKey;
    const tx = build([
      ComputeBudgetProgram.setComputeUnitLimit({ units: 300_000 }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1000 }),
      wrap(),
      tokenIx(17, [wsol]),
      route,
      tokenIx(9, [wsol, taker, taker]),
    ]);
    expect(check(tx)).toBeNull();
  });

  it("refuses an unknown program", () => {
    const drainer = new TransactionInstruction({ programId: Keypair.generate().publicKey, keys: [], data: Buffer.from([1]) });
    expect(check(build([route, drainer]))).toMatch(/unknown program/);
  });

  it("refuses an approval, an authority change or a token transfer at the top level", () => {
    for (const code of [4, 6, 3, 12]) {
      expect(check(build([tokenIx(code, [thief, taker]), route]))).toMatch(/token instruction/);
    }
  });

  it("refuses closing an account into someone else's wallet", () => {
    expect(check(build([tokenIx(9, [Keypair.generate().publicKey, thief, taker])]))).toMatch(/refunds/);
  });

  it("refuses moving more SOL than the swap", () => {
    expect(check(build([wrap(LAMPORTS + 6_000_000), route]))).toMatch(/more SOL/);
  });

  it("refuses a huge priority fee", () => {
    const tx = build([ComputeBudgetProgram.setComputeUnitLimit({ units: 1_400_000 }), ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 100_000_000 }), route]);
    expect(check(tx)).toMatch(/priority fee/);
  });

  it("refuses a transaction another wallet pays for or co-signs", () => {
    expect(check(build([route], thief))).toMatch(/only signer/);
  });

  it("refuses garbage", () => {
    expect(check("not a transaction")).toMatch(/unreadable/);
  });
});
