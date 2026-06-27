/** The exact message a holder signs to prove wallet ownership for a given nonce.
 *  MUST stay byte-identical to bot/src/verify/signature.ts::verificationMessage —
 *  a cross-surface test guards this. */
export function verificationMessage(nonce: string): string {
  return `GL1TCH // verify rank\n\nSign this message to link your wallet. This is free, off-chain, and grants no spending access.\n\nNonce: ${nonce}`;
}

/** The live bot's public verification endpoint (Railway). Used as a fallback so
 *  /verify keeps working even if NEXT_PUBLIC_BOT_VERIFY_URL is unset or empty. */
const FALLBACK_BOT_VERIFY_URL =
  "https://gl1tch-bot-production.up.railway.app/verify";

/** Endpoint the bot exposes for signed verification payloads. */
export const BOT_VERIFY_URL = (() => {
  const env = process.env.NEXT_PUBLIC_BOT_VERIFY_URL?.trim();
  return env && /^https?:\/\//.test(env) ? env : FALLBACK_BOT_VERIFY_URL;
})();
