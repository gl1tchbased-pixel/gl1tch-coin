import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  ComputeBudgetProgram,
} from "@solana/web3.js";
import { createHash } from "crypto";

export const JUP_REFERRAL_PROGRAM_ID = new PublicKey(
  "REFER4ZgmyYx9c6He5XfaTMiGfdLwRnkV4RPp9t9iF3"
);
export const JUP_SWAP_PROJECT_PUBKEY = new PublicKey(
  "45ruCyfdRkWpRNGEqWzjCiXRHkZs8WXCLQ67Pnpye7Hp"
);
export const SYSTEM_PROGRAM_ID = new PublicKey(
  "11111111111111111111111111111111"
);
export const TOKEN_PROGRAM_ID = new PublicKey(
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
);
export const WSOL_MINT = new PublicKey(
  "So11111111111111111111111111111111111111112"
);
export const USDC_MINT = new PublicKey(
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
);
export const DEFAULT_REFERRAL_NAME = "GL1TCH";

export function getReferralAccountPda(
  name: string = DEFAULT_REFERRAL_NAME,
  projectPubKey: PublicKey = JUP_SWAP_PROJECT_PUBKEY,
  programId: PublicKey = JUP_REFERRAL_PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("referral"), projectPubKey.toBuffer(), Buffer.from(name, "utf8")],
    programId
  );
}

export function getReferralTokenAccountPda(
  referralAccountPubKey: PublicKey,
  mint: PublicKey,
  programId: PublicKey = JUP_REFERRAL_PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("referral_ata"), referralAccountPubKey.toBuffer(), mint.toBuffer()],
    programId
  );
}

function anchorSighash(name: string): Buffer {
  return createHash("sha256")
    .update(`global:${name}`)
    .digest()
    .subarray(0, 8);
}

export function buildInitializeReferralAccountWithNameIx(params: {
  payer: PublicKey;
  partner?: PublicKey;
  project?: PublicKey;
  name?: string;
}): TransactionInstruction {
  const name = params.name || DEFAULT_REFERRAL_NAME;
  const project = params.project || JUP_SWAP_PROJECT_PUBKEY;
  const partner = params.partner || params.payer;
  const [referralAccount] = getReferralAccountPda(name, project);

  const sighash = anchorSighash("initialize_referral_account_with_name");
  const nameBuf = Buffer.from(name, "utf8");
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32LE(nameBuf.length, 0);
  const data = Buffer.concat([sighash, lenBuf, nameBuf]);

  return new TransactionInstruction({
    programId: JUP_REFERRAL_PROGRAM_ID,
    keys: [
      { pubkey: params.payer, isSigner: true, isWritable: true },
      { pubkey: partner, isSigner: false, isWritable: false },
      { pubkey: project, isSigner: false, isWritable: false },
      { pubkey: referralAccount, isSigner: false, isWritable: true },
      { pubkey: SYSTEM_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data,
  });
}

export function buildInitializeReferralTokenAccountIx(params: {
  payer: PublicKey;
  referralAccount: PublicKey;
  mint: PublicKey;
  project?: PublicKey;
}): TransactionInstruction {
  const project = params.project || JUP_SWAP_PROJECT_PUBKEY;
  const [ata] = getReferralTokenAccountPda(params.referralAccount, params.mint);
  const sighash = anchorSighash("initialize_referral_token_account");

  return new TransactionInstruction({
    programId: JUP_REFERRAL_PROGRAM_ID,
    keys: [
      { pubkey: params.payer, isSigner: true, isWritable: true },
      { pubkey: project, isSigner: false, isWritable: false },
      { pubkey: params.referralAccount, isSigner: false, isWritable: false },
      { pubkey: ata, isSigner: false, isWritable: true },
      { pubkey: params.mint, isSigner: false, isWritable: false },
      { pubkey: SYSTEM_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data: sighash,
  });
}

export interface ReferralStatus {
  name: string;
  referralPda: string;
  referralInitialized: boolean;
  wsolAtaPda: string;
  wsolInitialized: boolean;
  usdcAtaPda: string;
  usdcInitialized: boolean;
  ready: boolean;
}

export async function checkReferralStatus(
  conn: Connection,
  name: string = DEFAULT_REFERRAL_NAME
): Promise<ReferralStatus> {
  const [referralPda] = getReferralAccountPda(name);
  const [wsolAtaPda] = getReferralTokenAccountPda(referralPda, WSOL_MINT);
  const [usdcAtaPda] = getReferralTokenAccountPda(referralPda, USDC_MINT);

  const infos = await conn.getMultipleAccountsInfo([
    referralPda,
    wsolAtaPda,
    usdcAtaPda,
  ]);

  const referralInitialized = Boolean(infos[0]);
  const wsolInitialized = Boolean(infos[1]);
  const usdcInitialized = Boolean(infos[2]);

  return {
    name,
    referralPda: referralPda.toBase58(),
    referralInitialized,
    wsolAtaPda: wsolAtaPda.toBase58(),
    wsolInitialized,
    usdcAtaPda: usdcAtaPda.toBase58(),
    usdcInitialized,
    ready: referralInitialized && wsolInitialized,
  };
}

export async function buildCompleteReferralSetupTransaction(params: {
  conn: Connection;
  payer: PublicKey;
  name?: string;
  microLamports?: number;
}): Promise<{ tx: Transaction; status: ReferralStatus; missingCount: number }> {
  const name = params.name || DEFAULT_REFERRAL_NAME;
  const status = await checkReferralStatus(params.conn, name);
  const [referralPda] = getReferralAccountPda(name);

  const tx = new Transaction();
  let missingCount = 0;

  if (params.microLamports && params.microLamports > 0) {
    tx.add(
      ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: params.microLamports,
      })
    );
  }

  if (!status.referralInitialized) {
    tx.add(
      buildInitializeReferralAccountWithNameIx({
        payer: params.payer,
        name,
      })
    );
    missingCount++;
  }

  if (!status.wsolInitialized) {
    tx.add(
      buildInitializeReferralTokenAccountIx({
        payer: params.payer,
        referralAccount: referralPda,
        mint: WSOL_MINT,
      })
    );
    missingCount++;
  }

  if (!status.usdcInitialized) {
    tx.add(
      buildInitializeReferralTokenAccountIx({
        payer: params.payer,
        referralAccount: referralPda,
        mint: USDC_MINT,
      })
    );
    missingCount++;
  }

  const { blockhash } = await params.conn.getLatestBlockhash("finalized");
  tx.recentBlockhash = blockhash;
  tx.feePayer = params.payer;

  return { tx, status, missingCount };
}

