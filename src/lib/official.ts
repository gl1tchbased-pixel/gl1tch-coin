/**
 * GL1TCH — single source of truth for official links, launch state, and verified trust.
 * Imported by website, bot, and dashboard. Updating launch state = editing this one file.
 *
 * NOTE: handles below follow the `gl1tch` convention and are PLACEHOLDERS until the
 * accounts/domain are registered and confirmed owned. Never publish a link until verified.
 */

export const LAUNCH_STATUS = {
  PRE_LAUNCH: "PRE_LAUNCH",
  LAUNCHING: "LAUNCHING",
  LIVE: "LIVE",
  POST_LAUNCH: "POST_LAUNCH",
} as const;

export type LaunchStatus = (typeof LAUNCH_STATUS)[keyof typeof LAUNCH_STATUS];

export const CURRENT_LAUNCH_STATUS: LaunchStatus = LAUNCH_STATUS.LIVE;

/** Official channels (PLACEHOLDER — register & confirm before publishing). */
export const OFFICIAL = {
  X_URL: "https://x.com/gl1tchbased",
  TG_URL: "https://t.me/gl1tch_infected",
  IG_URL: "https://instagram.com/gl1tch_infected",
  REDDIT_URL: "https://reddit.com/user/gl1tch_infected",
  SITE_URL: "https://coin-three-mu.vercel.app",
  GITHUB_URL: "https://github.com/gl1tchbased-pixel/gl1tch-coin",
} as const;

/** Set at launch from the Pump.fun mint. Empty until LIVE. */
export const CONTRACT_ADDRESS = "3HQJwwHvzy8pGkPqGQcb4thZCH88MUCHVVSNtHn6pump";

/** Fresh, dedicated give-back wallet — generated at setup, never a personal wallet. */
export const GIVEBACK_WALLET = "CSxey8FbMS5dDG7Z5usH9gmXgLQqXTN6m25NRdqAC6g4";

/** Token deployer wallet (verified on-chain via RugCheck/Solscan). */
export const DEPLOYER_WALLET = "H5qbtquJzLVrwYj5opedoQCy9edQQZAtiyPMTMFFaFb4";

/** Solscan account link helper. */
export const solscanAccount = (addr: string) =>
  addr ? `https://solscan.io/account/${addr}` : "";

/** Derived explorer/market links (only meaningful once CONTRACT_ADDRESS is set). */
export const links = {
  explorer: CONTRACT_ADDRESS
    ? `https://solscan.io/token/${CONTRACT_ADDRESS}`
    : "",
  dexscreener: CONTRACT_ADDRESS
    ? `https://dexscreener.com/solana/${CONTRACT_ADDRESS}`
    : "",
  // Verified GeckoTerminal listing (token-info update approved 2026-07-05).
  geckoterminal: CONTRACT_ADDRESS
    ? `https://www.geckoterminal.com/solana/tokens/${CONTRACT_ADDRESS}`
    : "",
  pumpfun: CONTRACT_ADDRESS ? `https://pump.fun/coin/${CONTRACT_ADDRESS}` : "",
  rugcheck: CONTRACT_ADDRESS
    ? `https://rugcheck.xyz/tokens/${CONTRACT_ADDRESS}`
    : "",
  solsniffer: CONTRACT_ADDRESS
    ? `https://solsniffer.com/scanner/${CONTRACT_ADDRESS}`
    : "",
  givebackWallet: GIVEBACK_WALLET
    ? `https://solscan.io/account/${GIVEBACK_WALLET}`
    : "",
} as const;

/**
 * Verified trust state. Populated from onchain/verify.ts output — DO NOT hardcode `true`.
 * While false/null, the website must NOT display a checkmark for that guarantee.
 */
export const TRUST_REPORT = {
  // Verified on-chain 2026-05-29 (Token-2022 mint): authorities null, 1B fixed supply, no transfer fee.
  mintRevoked: true,
  freezeRevoked: true,
  // Token-2022 mint with NO transfer fee extension → buys/sells are zero-tax at protocol level.
  zeroTax: true,
  // Verified 2026-06-28 via RugCheck + our own scanner: LP 100% locked/burned. The dev cannot pull the pool.
  lpBurnedOrLocked: true,
  // RugCheck normalized risk score. Lower is better; 1 with no risks = clean.
  // Verified 2026-05-30 via api.rugcheck.xyz.
  rugcheckScore: 1 as number | null,
  rugcheckRiskLevel: "Low" as "Low" | "Medium" | "High" | "Danger" | null,
  rugcheckUrl: "https://rugcheck.xyz/tokens/3HQJwwHvzy8pGkPqGQcb4thZCH88MUCHVVSNtHn6pump",
} as const;

export const DISCLAIMER =
  "$GL1TCH is a community-driven, internet-native meme brand and token. It is not a security, investment contract, or financial product, and nothing here is financial advice. Crypto is high-risk; you may lose your entire purchase. You are responsible for compliance with your local laws.";

export const IMPERSONATION_WARNING =
  (CURRENT_LAUNCH_STATUS as LaunchStatus) === LAUNCH_STATUS.PRE_LAUNCH
    ? "No contract exists yet. Anyone selling $GL1TCH now is a scam. Admins never DM first."
    : "Only trust links published on this page and in official GL1TCH channels. Admins never DM first.";
