import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  ComputeBudgetProgram,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";

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

// Deterministic 8-byte Anchor discriminators (zero Node crypto dependencies, safe in any browser)
// sha256("global:initialize_referral_account_with_name")[0..8] -> f1be6b1af4ec77e5
export const SIGHASH_INIT_REFERRAL = new Uint8Array([
  241, 190, 107, 26, 244, 236, 119, 229,
]);

// sha256("global:initialize_referral_token_account")[0..8] -> 7d12465f56b3ddbe
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

  return new TransactionInstruction({
    programId: JUP_REFERRAL_PROGRAM_ID,
    keys: [
      { pubkey: params.payer, isSigner: true, isWritable: true },
      { pubkey: partner, isSigner: false, isWritable: false },
      { pubkey: project, isSigner: false, isWritable: false },
      { pubkey: referralAccount, isSigner: false, isWritable: true },
      { pubkey: SYSTEM_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data: Buffer.from(data),
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
    data: Buffer.from(SIGHASH_INIT_TOKEN),
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
  onlyBase?: boolean;
}): Promise<{
  tx: Transaction;
  versionedTx: VersionedTransaction;
  status: ReferralStatus;
  missingCount: number;
}> {
  const name = params.name || DEFAULT_REFERRAL_NAME;
  const status = await checkReferralStatus(params.conn, name);
  const [referralPda] = getReferralAccountPda(name);

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
        })
      );
      missingCount++;
    }
  }

  const { blockhash } = await params.conn.getLatestBlockhash("confirmed");

  // Legacy Transaction
  const tx = new Transaction();
  instructions.forEach((ix) => tx.add(ix));
  tx.recentBlockhash = blockhash;
  tx.feePayer = params.payer;

  // Modern Versioned Transaction (v0)
  const messageV0 = new TransactionMessage({
    payerKey: params.payer,
    recentBlockhash: blockhash,
    instructions,
  }).compileToV0Message();
  const versionedTx = new VersionedTransaction(messageV0);

  return { tx, versionedTx, status, missingCount };
}
