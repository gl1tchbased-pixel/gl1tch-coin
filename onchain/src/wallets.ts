import { readFileSync, existsSync } from "node:fs";
import { Connection, Keypair } from "@solana/web3.js";
import { config } from "./config.js";

export function getConnection(): Connection {
  return new Connection(config.rpcUrl, "confirmed");
}

/** Load a keypair from a JSON byte-array file. Never hardcode secrets. */
export function loadKeypair(path: string): Keypair {
  if (!existsSync(path)) {
    throw new Error(
      `Keypair file not found: ${path}. Generate one with \`solana-keygen new -o ${path}\` (and keep it out of git).`
    );
  }
  const bytes = JSON.parse(readFileSync(path, "utf8")) as number[];
  return Keypair.fromSecretKey(Uint8Array.from(bytes));
}

export function getFeePayer(): Keypair {
  return loadKeypair(config.feePayerKeypairPath);
}

export function getTreasury(): Keypair {
  return loadKeypair(config.treasuryKeypairPath);
}
