import nacl from "tweetnacl";
import bs58 from "bs58";

/**
 * Agent self-registration (Agent Trust Layer v1). Agents are programmatic — they don't click
 * "connect wallet"; they sign a registration message with their own keypair and POST it. This
 * proves the agent controls the wallet (identity), moving nothing. Ed25519 / Solana convention.
 */

const FRESH_MS = 10 * 60_000; // signed message must be <10 min old (replay window)

/** The exact message an agent signs to register. Includes the wallet + an issued timestamp. */
export function agentRegMessage(address: string, issuedMs: number): string {
  return `GL1TCH Agent Registration\nWallet: ${address}\nIssued: ${issuedMs}\nThis proves wallet ownership. It moves no funds and grants no access.`;
}

export interface RegRequest {
  address: string;
  issued: number; // client timestamp (ms) that was embedded in the signed message
  signature: string; // base58 ed25519 signature over agentRegMessage(address, issued)
}

export type RegResult =
  | { ok: true }
  | { ok: false; error: "stale" | "bad_signature" | "malformed" };

/** Verify a registration request: signature valid for `address` over the fresh message. */
export function verifyAgentRegistration(req: RegRequest, now = Date.now()): RegResult {
  if (!req.address || typeof req.issued !== "number" || !req.signature) return { ok: false, error: "malformed" };
  if (Math.abs(now - req.issued) > FRESH_MS) return { ok: false, error: "stale" };
  try {
    const message = new TextEncoder().encode(agentRegMessage(req.address, req.issued));
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
