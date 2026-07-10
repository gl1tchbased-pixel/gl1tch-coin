import nacl from "tweetnacl";
import bs58 from "bs58";
import { randomBytes } from "node:crypto";

/**
 * API-key issuance auth. A wallet proves ownership by signing a message with its own
 * ed25519 keypair (moves no funds, grants no access). The bot then reads the wallet's
 * sustained $GL1TCH balance and mints a rate-tiered API key — making the token a
 * REQUIRED access key for programmatic / bulk / depth API use (the free human-facing
 * scanner stays free). Non-custodial: keys gate rate/depth, never funds.
 */

const FRESH_MS = 10 * 60_000;

export function apiKeyMessage(address: string, issuedMs: number): string {
  return `GL1TCH API Key\nWallet: ${address}\nIssued: ${issuedMs}\nThis proves wallet ownership to issue a rate-limited API key. It moves no funds and grants no access to your wallet.`;
}

export interface KeyReq {
  address: string;
  issued: number;
  signature: string;
}

export type KeyAuth = { ok: true } | { ok: false; error: "stale" | "bad_signature" | "malformed" };

export function verifyApiKeyReq(req: KeyReq, now = Date.now()): KeyAuth {
  if (!req.address || typeof req.issued !== "number" || !req.signature) return { ok: false, error: "malformed" };
  if (Math.abs(now - req.issued) > FRESH_MS) return { ok: false, error: "stale" };
  try {
    const message = new TextEncoder().encode(apiKeyMessage(req.address, req.issued));
    const publicKey = bs58.decode(req.address);
    const signature = bs58.decode(req.signature);
    if (publicKey.length !== 32 || signature.length !== 64) return { ok: false, error: "malformed" };
    return nacl.sign.detached.verify(message, signature, publicKey)
      ? { ok: true }
      : { ok: false, error: "bad_signature" };
  } catch {
    return { ok: false, error: "malformed" };
  }
}

/** A fresh opaque API key. */
export function newApiKey(): string {
  return "gk_" + randomBytes(20).toString("hex");
}
