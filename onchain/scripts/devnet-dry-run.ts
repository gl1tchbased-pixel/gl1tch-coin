/**
 * Full devnet rehearsal: create mint → mint full supply → revoke authorities → verify.
 * Run: `npm run devnet-dry-run` (requires SOLANA_CLUSTER=devnet and a funded fee payer).
 */
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { config, isMainnet } from "../src/config.js";
import { getConnection, getFeePayer } from "../src/wallets.js";
import { createGl1tchMint } from "../src/token/createMint.js";
import { mintFullSupply } from "../src/token/mintSupply.js";
import { revokeAuthorities } from "../src/token/revokeAuthorities.js";
import { buildTrustReport, printTrustReport } from "../src/token/verify.js";

async function main() {
  if (isMainnet) {
    throw new Error("devnet-dry-run must NOT run on mainnet-beta. Set SOLANA_CLUSTER=devnet.");
  }

  const connection = getConnection();
  const payer = getFeePayer();
  console.log(`Cluster:   ${config.cluster}`);
  console.log(`Fee payer: ${payer.publicKey.toBase58()}`);

  // Ensure the payer has some devnet SOL.
  const bal = await connection.getBalance(payer.publicKey);
  if (bal < 0.5 * LAMPORTS_PER_SOL) {
    console.log("Low balance — requesting devnet airdrop (1 SOL)…");
    try {
      const sig = await connection.requestAirdrop(payer.publicKey, LAMPORTS_PER_SOL);
      await connection.confirmTransaction(sig, "confirmed");
    } catch {
      console.warn("Airdrop failed (rate-limited?). Fund the payer manually and retry.");
    }
  }

  console.log("\n1) Creating mint…");
  const mint = await createGl1tchMint(connection, payer);
  console.log(`   Mint: ${mint.toBase58()}`);

  console.log("2) Minting full supply to treasury (payer for dry-run)…");
  const mintSig = await mintFullSupply(connection, payer, mint, payer.publicKey);
  console.log(`   Sig: ${mintSig}`);

  console.log("3) Revoking mint + freeze authority…");
  const { mintSig: revMint, freezeSig } = await revokeAuthorities(
    connection,
    payer,
    mint,
    payer
  );
  console.log(`   Mint authority revoked: ${revMint}`);
  console.log(`   Freeze authority revoked: ${freezeSig}`);

  console.log("4) Verifying on-chain state…");
  const report = await buildTrustReport(connection, mint);
  printTrustReport(report, "https://solscan.io");

  if (!report.allPassed) {
    throw new Error("Trust report FAILED — investigate before any mainnet launch.");
  }
  console.log("Devnet dry-run complete. Rehearsal PASSED.");
}

main().catch((err) => {
  console.error("Dry-run failed:", err);
  process.exit(1);
});
