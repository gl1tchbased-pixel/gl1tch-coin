/**
 * GL1TCH — single source of truth for official links, launch state, and verified trust.
 * Imported by website and bot. Updating launch state = editing this one file.
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
  SITE_URL: "https://gl1tchbased.xyz",
  GITHUB_URL: "https://github.com/gl1tchbased-pixel/gl1tch-coin",
} as const;

/** Set at launch from the Pump.fun mint. Empty until LIVE. */
export const CONTRACT_ADDRESS = "3HQJwwHvzy8pGkPqGQcb4thZCH88MUCHVVSNtHn6pump";

/** Fresh, dedicated give-back wallet — generated at setup, never a personal wallet. */
export const GIVEBACK_WALLET = "CSxey8FbMS5dDG7Z5usH9gmXgLQqXTN6m25NRdqAC6g4";

/** Token deployer wallet (verified on-chain via RugCheck/Solscan). */
export const DEPLOYER_WALLET = "H5qbtquJzLVrwYj5opedoQCy9edQQZAtiyPMTMFFaFb4";

/** Verdict-anchoring attester (A3): the only key that signs GL1TCH's on-chain seals. Pinned here, in the public
 *  repo, so changing it shows in git history. A fee-only wallet: a little SOL for fees, never any tokens. */
export const ATTESTER_WALLET = "BSq18aJBhxYJgeEbcA3jGQNU1vmwZdo2PQkkpVsK7W6o";

/** Where money flows. Pinned in the public repo for the same reason as the attester: changing a destination takes a
 *  reviewed commit, not a changed setting, and the bot's money watch (bot/src/money-watch) compares the live site and
 *  the chain against its own copy of these. Env can turn a flow off, never point it elsewhere. */
export const PAY_TO_SOLANA: string = DEPLOYER_WALLET;
export const PAY_TO_BASE = "0xbE1e88C07a080078629f793013597E43183F6Dca";
export const REFERRAL_NAME = "GL1TCH";
/** Jupiter referral account for Safe Swap fees (Ultra project). */
export const REFERRAL_ACCOUNT = "J4T8vmahpgiGmjkDXTaacVSAw9iQxgP7P81PCS31PsDB";
/** Who owns those fees on chain. Still the attester, so no fee flows yet (referral-check.ts refuses it); it changes
 *  to the cold wallet once the founder runs scripts/vault-transfer (docs/security/treasury-runbook.md). */
export const REFERRAL_PARTNER: string = ATTESTER_WALLET;

/** Solscan account link helper. */
export const solscanAccount = (addr: string) =>
  addr ? `https://solscan.io/account/${addr}` : "";

/** Derived explorer/market links (only meaningful once CONTRACT_ADDRESS is set). */
export const links = {
  explorer: CONTRACT_ADDRESS
    ? `https://solscan.io/token/${CONTRACT_ADDRESS}`
    : "",
  // Not linked from the UI: DexScreener delisted the pair (low volume), so this page
  // shows no market. Re-link it if DexScreener re-indexes the pool.
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
  // Verified 2026-10-08 via getAccountInfo (jsonParsed): tokenMetadata.updateAuthority and
  // metadataPointer.authority are both null → name, symbol and image URI can never change.
  metadataImmutable: true,
  // Verified 2026-10-31: the pool is the Pump.fun bonding curve PDA of the mint, so no LP token exists to pull.
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
    ? "No contract exists yet. Anyone selling $GL1TCH now is a scam. GL1TCH accounts never DM first."
    : "Only trust links published on this page and in official GL1TCH channels. GL1TCH accounts never DM first.";
