import { Connection, PublicKey } from "@solana/web3.js";
import { getMint } from "@solana/spl-token";
import { config } from "../config.js";

export interface TrustReport {
  mint: string;
  mintRevoked: boolean;
  freezeRevoked: boolean;
  supplyOk: boolean;
  actualSupply: string;
  expectedSupply: string;
  decimals: number;
  allPassed: boolean;
}

/**
 * Read live on-chain mint state and produce a Trust Report.
 * This is the source of truth for the website's Trust Wall — never hardcode.
 */
export async function buildTrustReport(
  connection: Connection,
  mint: PublicKey
): Promise<TrustReport> {
  const info = await getMint(connection, mint);

  const expectedRaw =
    BigInt(config.token.totalSupply) * 10n ** BigInt(info.decimals);

  const mintRevoked = info.mintAuthority === null;
  const freezeRevoked = info.freezeAuthority === null;
  const supplyOk = info.supply === expectedRaw;

  return {
    mint: mint.toBase58(),
    mintRevoked,
    freezeRevoked,
    supplyOk,
    actualSupply: info.supply.toString(),
    expectedSupply: expectedRaw.toString(),
    decimals: info.decimals,
    allPassed: mintRevoked && freezeRevoked && supplyOk,
  };
}

export function printTrustReport(r: TrustReport, explorerBase: string) {
  const mark = (b: boolean) => (b ? "✓" : "✗");
  console.log("\n=== GL1TCH TRUST REPORT ===");
  console.log(`Mint:            ${r.mint}`);
  console.log(`${mark(r.mintRevoked)} Mint authority revoked`);
  console.log(`${mark(r.freezeRevoked)} Freeze authority revoked`);
  console.log(
    `${mark(r.supplyOk)} Supply correct (${r.actualSupply} / ${r.expectedSupply})`
  );
  console.log(`Explorer:        ${explorerBase}/token/${r.mint}`);
  console.log(`RugCheck:        https://rugcheck.xyz/tokens/${r.mint}`);
  console.log(`Overall:         ${r.allPassed ? "PASS ✓" : "FAIL ✗"}`);
  console.log("===========================\n");
}
