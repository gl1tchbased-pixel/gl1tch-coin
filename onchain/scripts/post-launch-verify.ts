/**
 * Read-only verification of a live mint. Run any time post-launch.
 * Usage: `npm run post-launch-verify -- <MINT_ADDRESS>`  (or set MINT env var)
 */
import { PublicKey } from "@solana/web3.js";
import { config, isMainnet } from "../src/config.js";
import { getConnection } from "../src/wallets.js";
import { buildTrustReport, printTrustReport } from "../src/token/verify.js";

async function main() {
  const arg = process.argv[2] || process.env.MINT;
  if (!arg) {
    throw new Error("Provide the mint address: npm run post-launch-verify -- <MINT>");
  }
  const mint = new PublicKey(arg);
  const connection = getConnection();
  const explorer = isMainnet
    ? "https://solscan.io"
    : `https://solscan.io?cluster=${config.cluster}`;

  const report = await buildTrustReport(connection, mint);
  printTrustReport(report, explorer);
  process.exit(report.allPassed ? 0 : 1);
}

main().catch((err) => {
  console.error("Verify failed:", err);
  process.exit(1);
});
