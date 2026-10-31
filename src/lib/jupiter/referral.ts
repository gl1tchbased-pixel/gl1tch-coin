import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
  ComputeBudgetProgram,
} from "@solana/web3.js";

export const JUP_REFERRAL_PROGRAM_ID = new PublicKey(
  "REFER4ZgmyYx9c6He5XfaTMiGfdLwRnkV4RPp9t9iF3"
);
// Classic Jupiter Swap Project (v6)
export const JUP_SWAP_PROJECT_PUBKEY = new PublicKey(
  "45ruCyfdRkWpRNGEqWzjCiXRHkZs8WXCLQ67Pnpye7Hp"
);
// Jupiter Ultra Project (v2 Order API used by Safe Swap)
export const JUP_ULTRA_PROJECT_PUBKEY = new PublicKey(
  "DkiqsTrw1u1bYFumumC7sCG2S8K25qc2vemJFHyW2wJc"
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

// Deterministic 8-byte Anchor discriminators
export const SIGHASH_INIT_REFERRAL = new Uint8Array([
  241, 190, 107, 26, 244, 236, 119, 229,
]);

export const SIGHASH_INIT_TOKEN = new Uint8Array([
  125, 18, 70, 95, 86, 179, 221, 190,
]);

export function getReferralAccountPda(
  name: string = DEFAULT_REFERRAL_NAME,
  projectPubKey: PublicKey = JUP_SWAP_PROJECT_PUBKEY,
  programId: PublicKey = JUP_REFERRAL_PROGRAM_ID
): [PublicKey, number] {
  const encoder = new TextEncoder();
  return PublicKey.findProgramAddressSync(
    [encoder.encode("referral"), projectPubKey.toBuffer(), encoder.encode(name)],
    programId
  );
}

export function getReferralTokenAccountPda(
  referralAccountPubKey: PublicKey,
  mint: PublicKey,
  programId: PublicKey = JUP_REFERRAL_PROGRAM_ID
): [PublicKey, number] {
  const encoder = new TextEncoder();
  return PublicKey.findProgramAddressSync(
    [encoder.encode("referral_ata"), referralAccountPubKey.toBuffer(), mint.toBuffer()],
    programId
  );
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

  const encoder = new TextEncoder();
  const nameBytes = encoder.encode(name);
  const data = new Uint8Array(8 + 4 + nameBytes.length);
  data.set(SIGHASH_INIT_REFERRAL, 0);
  const view = new DataView(data.buffer);
  view.setUint32(8, nameBytes.length, true);
  data.set(nameBytes, 12);

  const instructionData = typeof Buffer !== "undefined" ? Buffer.from(data) : (data as unknown as Buffer);

  return new TransactionInstruction({
    programId: JUP_REFERRAL_PROGRAM_ID,
    keys: [
      { pubkey: params.payer, isSigner: true, isWritable: true },
      { pubkey: partner, isSigner: false, isWritable: false },
      { pubkey: project, isSigner: false, isWritable: false },
      { pubkey: referralAccount, isSigner: false, isWritable: true },
      { pubkey: SYSTEM_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data: instructionData,
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

  const instructionData = typeof Buffer !== "undefined" ? Buffer.from(SIGHASH_INIT_TOKEN) : (SIGHASH_INIT_TOKEN as unknown as Buffer);

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
    data: instructionData,
  });
}

export interface DualReferralStatus {
  classic: {
    project: string;
    referralPda: string;
    referralInitialized: boolean;
    wsolAtaPda: string;
    wsolInitialized: boolean;
    usdcAtaPda: string;
    usdcInitialized: boolean;
    ready: boolean;
  };
  ultra: {
    project: string;
    referralPda: string;
    referralInitialized: boolean;
    wsolAtaPda: string;
    wsolInitialized: boolean;
    ready: boolean;
  };
  ready: boolean;
}

export async function checkDualReferralStatus(
  conn: Connection,
  name: string = DEFAULT_REFERRAL_NAME
): Promise<DualReferralStatus> {
  const [classicPda] = getReferralAccountPda(name, JUP_SWAP_PROJECT_PUBKEY);
  const [classicWsol] = getReferralTokenAccountPda(classicPda, WSOL_MINT);
  const [classicUsdc] = getReferralTokenAccountPda(classicPda, USDC_MINT);

  const [ultraPda] = getReferralAccountPda(name, JUP_ULTRA_PROJECT_PUBKEY);
  const [ultraWsol] = getReferralTokenAccountPda(ultraPda, WSOL_MINT);

  const infos = await conn.getMultipleAccountsInfo([
    classicPda,
    classicWsol,
    classicUsdc,
    ultraPda,
    ultraWsol,
  ]);

  const classicInit = Boolean(infos[0]);
  const classicWsolInit = Boolean(infos[1]);
  const classicUsdcInit = Boolean(infos[2]);
  const ultraInit = Boolean(infos[3]);
  const ultraWsolInit = Boolean(infos[4]);

  return {
    classic: {
      project: JUP_SWAP_PROJECT_PUBKEY.toBase58(),
      referralPda: classicPda.toBase58(),
      referralInitialized: classicInit,
      wsolAtaPda: classicWsol.toBase58(),
      wsolInitialized: classicWsolInit,
      usdcAtaPda: classicUsdc.toBase58(),
      usdcInitialized: classicUsdcInit,
      ready: classicInit && classicWsolInit,
    },
    ultra: {
      project: JUP_ULTRA_PROJECT_PUBKEY.toBase58(),
      referralPda: ultraPda.toBase58(),
      referralInitialized: ultraInit,
      wsolAtaPda: ultraWsol.toBase58(),
      wsolInitialized: ultraWsolInit,
      ready: ultraInit && ultraWsolInit,
    },
    ready: ultraInit && ultraWsolInit,
  };
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
  name: string = DEFAULT_REFERRAL_NAME,
  projectPubKey: PublicKey = JUP_ULTRA_PROJECT_PUBKEY
): Promise<ReferralStatus> {
  const [referralPda] = getReferralAccountPda(name, projectPubKey);
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
  project?: PublicKey;
  microLamports?: number;
  onlyBase?: boolean;
}): Promise<{
  tx: Transaction;
  versionedTx: VersionedTransaction;
  status: ReferralStatus;
  missingCount: number;
}> {
  const name = params.name || DEFAULT_REFERRAL_NAME;
  const project = params.project || JUP_ULTRA_PROJECT_PUBKEY;
  const status = await checkReferralStatus(params.conn, name, project);
  const [referralPda] = getReferralAccountPda(name, project);

  const instructions: TransactionInstruction[] = [];
  let missingCount = 0;

  if (params.microLamports && params.microLamports > 0) {
    instructions.push(
      ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: params.microLamports,
      })
    );
  }

  if (!status.referralInitialized) {
    instructions.push(
      buildInitializeReferralAccountWithNameIx({
        payer: params.payer,
        project,
        name,
      })
    );
    missingCount++;
  }

  if (!params.onlyBase) {
    if (!status.wsolInitialized) {
      instructions.push(
        buildInitializeReferralTokenAccountIx({
          payer: params.payer,
          referralAccount: referralPda,
          mint: WSOL_MINT,
          project,
        })
      );
      missingCount++;
    }

    if (!status.usdcInitialized) {
      instructions.push(
        buildInitializeReferralTokenAccountIx({
          payer: params.payer,
          referralAccount: referralPda,
          mint: USDC_MINT,
          project,
        })
      );
      missingCount++;
    }
  }

  const { blockhash } = await params.conn.getLatestBlockhash("confirmed");

  const tx = new Transaction();
  instructions.forEach((ix) => tx.add(ix));
  tx.recentBlockhash = blockhash;
  tx.feePayer = params.payer;

  const messageV0 = new TransactionMessage({
    payerKey: params.payer,
    recentBlockhash: blockhash,
    instructions,
  }).compileToV0Message();
  const versionedTx = new VersionedTransaction(messageV0);

  return { tx, versionedTx, status, missingCount };
}
