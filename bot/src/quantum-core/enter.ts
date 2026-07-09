import nacl from "tweetnacl";
import bs58 from "bs58";

/**
 * Quantum Draw entry auth — a wallet proves ownership by signing an entry message
 * with its own ed25519 keypair (Solana convention). Moves no funds, grants no
 * access. Replay-protected: message embeds the drawId + a fresh issued timestamp,
 * and the same signature can't be reused for a different draw or after it expires.
 */

const FRESH_MS = 10 * 60_000;

export function drawEntryMessage(address: string, drawId: string, issuedMs: number): string {
  return `GL1TCH Quantum Draw Entry\nWallet: ${address}\nDraw: ${drawId}\nIssued: ${issuedMs}\nThis enters you into a provably-fair draw. It moves no funds and grants no access.`;
}

export interface EnterRequest {
  address: string;
  drawId: string;
  issued: number;
  signature: string;
}

export type EnterAuth =
  | { ok: true }
  | { ok: false; error: "stale" | "bad_signature" | "malformed" };

export function verifyDrawEntry(req: EnterRequest, now = Date.now()): EnterAuth {
  if (!req.address || !req.drawId || typeof req.issued !== "number" || !req.signature) {
    return { ok: false, error: "malformed" };
  }
  if (Math.abs(now - req.issued) > FRESH_MS) return { ok: false, error: "stale" };
  try {
    const message = new TextEncoder().encode(drawEntryMessage(req.address, req.drawId, req.issued));
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
