import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { NATIVE_MINT, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import {
  Raydium,
  TxVersion,
  CREATE_CPMM_POOL_PROGRAM,
  CREATE_CPMM_POOL_FEE_ACC,
} from "@raydium-io/raydium-sdk-v2";
import BN from "bn.js";

export interface CpmmPoolParams {
  /** The $GL1TCH SPL mint. */
  tokenMint: PublicKey;
  tokenDecimals: number;
  /** Token side of the pool, in BASE UNITS (use poolMath.toRaw). */
  tokenRawAmount: bigint;
  /** SOL side of the pool, in lamports. Sets the opening price. */
  solLamports: bigint;
  cluster: "mainnet-beta" | "devnet";
}

export interface CpmmPoolResult {
  txId: string;
  poolId: string;
  lpMint: string;
}

/**
 * Create a Raydium CPMM (constant-product) pool pairing $GL1TCH with native SOL.
 *
 * IMPORTANT: Raydium's CPMM program is a MAINNET facility. Its devnet deployment is
 * unreliable, so the devnet dry-run rehearses token creation only — run pool creation
 * on mainnet-beta with CONFIRM_MAINNET=true after the token rehearsal passes.
 *
 * After this succeeds, burn or lock the LP tokens (see burnLp.ts / LP_ACTION) so
 * liquidity can never be pulled.
 */
export async function createCpmmPool(
  connection: Connection,
  payer: Keypair,
  params: CpmmPoolParams
): Promise<CpmmPoolResult> {
  const raydium = await Raydium.load({
    connection,
    owner: payer,
    cluster: params.cluster === "mainnet-beta" ? "mainnet" : "devnet",
  });

  // Fee tier for the CPMM pool (standard tier).
  const feeConfigs = await raydium.api.getCpmmConfigs();
  if (!feeConfigs || feeConfigs.length === 0) {
    throw new Error("Could not load Raydium CPMM fee configs from the API.");
  }

  const { execute, extInfo } = await raydium.cpmm.createPool({
    programId: CREATE_CPMM_POOL_PROGRAM,
    poolFeeAccount: CREATE_CPMM_POOL_FEE_ACC,
    mintA: {
      address: params.tokenMint.toBase58(),
      decimals: params.tokenDecimals,
      programId: TOKEN_PROGRAM_ID.toBase58(),
    },
    mintB: {
      address: NATIVE_MINT.toBase58(),
      decimals: 9,
      programId: TOKEN_PROGRAM_ID.toBase58(),
    },
    mintAAmount: new BN(params.tokenRawAmount.toString()),
    mintBAmount: new BN(params.solLamports.toString()),
    startTime: new BN(0),
    feeConfig: feeConfigs[0],
    associatedOnly: false,
    ownerInfo: { useSOLBalance: true },
    txVersion: TxVersion.V0,
  });

  const { txId } = await execute({ sendAndConfirm: true });
  const addr = extInfo.address as { poolId: PublicKey; lpMint: PublicKey };
  return {
    txId,
    poolId: addr.poolId.toBase58(),
    lpMint: addr.lpMint.toBase58(),
  };
}
