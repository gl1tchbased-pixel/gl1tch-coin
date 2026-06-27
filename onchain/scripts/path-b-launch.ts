/**
 * Path B (self-managed mint + Raydium CPMM pool) launch sequence.
 *
 *   create mint → metadata → mint full supply → revoke authorities → verify
 *   → (mainnet only) create CPMM pool → burn/lock LP
 *
 * Devnet rehearses everything EXCEPT pool creation — Raydium's CPMM program is a
 * mainnet facility and its devnet deployment is unreliable. The pool + LP steps run
 * only on mainnet-beta with CONFIRM_MAINNET=true.
 *
 * Run: `npm run path-b-launch`
 */
import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { config, isMainnet, assertMainnetGuard } from "../src/config.js";
import { getConnection, getFeePayer, getTreasury } from "../src/wallets.js";
import { createGl1tchMint } from "../src/token/createMint.js";
import { createTokenMetadata } from "../src/token/metadata.js";
import { mintFullSupply } from "../src/token/mintSupply.js";
import { revokeAuthorities } from "../src/token/revokeAuthorities.js";
import { buildTrustReport, printTrustReport } from "../src/token/verify.js";
import { createCpmmPool } from "../src/liquidity/raydiumPool.js";
import { burnAllLp } from "../src/liquidity/burnLp.js";
import {
  tokensForLiquidity,
  toRaw,
  initialPriceInSol,
} from "../src/liquidity/poolMath.js";

async function main() {
  assertMainnetGuard();
  const connection = getConnection();
  const payer = getFeePayer();
  // On a real launch the treasury is a multisig; on devnet the payer doubles as it.
  let treasury = payer;
  try {
    treasury = getTreasury();
  } catch {
    console.log("No treasury keypair — using fee payer as treasury (devnet rehearsal).");
  }

  console.log(`Cluster:   ${config.cluster}`);
  console.log(`Fee payer: ${payer.publicKey.toBase58()}`);
  console.log(`Treasury:  ${treasury.publicKey.toBase58()}`);

  console.log("\n1) Creating mint…");
  const mint = await createGl1tchMint(connection, payer);
  console.log(`   Mint: ${mint.toBase58()}`);

  if (config.token.metadataUri) {
    console.log("2) Creating Metaplex metadata…");
    const sig = await createTokenMetadata(connection, payer, mint, {
      name: config.token.name,
      symbol: config.token.symbol,
      uri: config.token.metadataUri,
      isMutable: !config.token.immutableMetadata,
    });
    console.log(`   Metadata sig: ${sig} (immutable: ${config.token.immutableMetadata})`);
  } else {
    console.log("2) Skipping metadata — METADATA_URI not set.");
  }

  console.log("3) Minting full supply to treasury…");
  const mintSig = await mintFullSupply(connection, payer, mint, treasury.publicKey);
  console.log(`   Sig: ${mintSig}`);

  console.log("4) Revoking mint + freeze authority…");
  const { mintSig: revMint, freezeSig } = await revokeAuthorities(connection, payer, mint, payer);
  console.log(`   Mint revoked: ${revMint}`);
  console.log(`   Freeze revoked: ${freezeSig}`);

  console.log("5) Verifying token state…");
  const report = await buildTrustReport(connection, mint);
  printTrustReport(report, "https://solscan.io");
  if (!report.allPassed) throw new Error("Trust report FAILED — stop and investigate.");

  // --- Liquidity ---
  const tokenUi = tokensForLiquidity(config.token.totalSupply, config.liquidity.publicPct);
  const tokenRaw = toRaw(tokenUi, config.token.decimals);
  const solLamports = BigInt(Math.round(config.liquidity.pairedSol * LAMPORTS_PER_SOL));
  const price = config.liquidity.pairedSol > 0 ? initialPriceInSol(tokenUi, config.liquidity.pairedSol) : 0;

  console.log("\n6) Pool sizing (Founder OS 3.6 allocation):");
  console.log(`   Public liquidity: ${tokenUi.toLocaleString("en-US")} ${config.token.symbol} (${config.liquidity.publicPct}%)`);
  console.log(`   Paired SOL: ${config.liquidity.pairedSol}`);
  console.log(`   Opening price: ${price} SOL / ${config.token.symbol}`);

  if (!isMainnet) {
    console.log(
      "\nPool creation SKIPPED on devnet (Raydium CPMM is mainnet-only).\n" +
        "Token rehearsal PASSED. Create the pool on mainnet-beta with CONFIRM_MAINNET=true."
    );
    return;
  }

  if (config.liquidity.pairedSol <= 0) {
    throw new Error("PAIRED_SOL must be > 0 to open a pool. Set it in .env.");
  }

  console.log("7) Creating Raydium CPMM pool…");
  const pool = await createCpmmPool(connection, payer, {
    tokenMint: mint,
    tokenDecimals: config.token.decimals,
    tokenRawAmount: tokenRaw,
    solLamports,
    cluster: "mainnet-beta",
  });
  console.log(`   Pool ID: ${pool.poolId}`);
  console.log(`   LP mint: ${pool.lpMint}`);
  console.log(`   Tx: ${pool.txId}`);

  if (config.liquidity.lpAction === "burn") {
    console.log("8) Burning LP tokens (rug-proof)…");
    const lpMint = new PublicKey(pool.lpMint);
    const lpAccount = getAssociatedTokenAddressSync(lpMint, payer.publicKey);
    const burnSig = await burnAllLp(connection, payer, lpMint, lpAccount, payer);
    console.log(`   LP burned: ${burnSig}`);
  } else {
    console.log(
      "8) LP_ACTION=lock — burn skipped. Lock the LP tokens via a reputable locker " +
        "now and publish the lock link. Never leave LP in a hot wallet."
    );
  }

  console.log("\nPath B launch complete.");
}

main().catch((err) => {
  console.error("Path B launch failed:", err);
  process.exit(1);
});
