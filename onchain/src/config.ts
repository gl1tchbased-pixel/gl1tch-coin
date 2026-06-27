import "dotenv/config";

export type Cluster = "devnet" | "mainnet-beta";

export const config = {
  cluster: (process.env.SOLANA_CLUSTER as Cluster) || "devnet",
  rpcUrl: process.env.RPC_URL || "https://api.devnet.solana.com",
  feePayerKeypairPath: process.env.FEE_PAYER_KEYPAIR_PATH || "./keys/fee-payer.json",
  treasuryKeypairPath: process.env.TREASURY_KEYPAIR_PATH || "./keys/treasury.json",
  token: {
    name: process.env.TOKEN_NAME || "GL1TCH",
    symbol: process.env.TOKEN_SYMBOL || "GL1TCH",
    decimals: Number(process.env.TOKEN_DECIMALS ?? 6),
    totalSupply: Number(process.env.TOKEN_TOTAL_SUPPLY ?? 1_000_000_000),
    metadataUri: process.env.METADATA_URI || "",
    immutableMetadata: process.env.IMMUTABLE_METADATA !== "false",
  },
  // Path B (self-managed pool) only. Pump.fun (Path A) ignores these.
  liquidity: {
    // Share of total supply seeded into the public pool (Founder OS 3.6: Public = 50%).
    publicPct: Number(process.env.PUBLIC_LIQUIDITY_PCT ?? 50),
    // SOL paired against the token in the initial pool. Sets the opening price.
    pairedSol: Number(process.env.PAIRED_SOL ?? 0),
    // What to do with LP tokens after pool creation: burn (rug-proof) or lock.
    lpAction: (process.env.LP_ACTION as "burn" | "lock") || "burn",
  },
  confirmMainnet: process.env.CONFIRM_MAINNET === "true",
};

export const isMainnet = config.cluster === "mainnet-beta";

/** Hard gate: refuse irreversible mainnet actions unless explicitly confirmed. */
export function assertMainnetGuard() {
  if (isMainnet && !config.confirmMainnet) {
    throw new Error(
      "Refusing to run on mainnet-beta without CONFIRM_MAINNET=true. " +
        "Rehearse on devnet first and review PRE_LAUNCH_CHECKLIST.md."
    );
  }
}
