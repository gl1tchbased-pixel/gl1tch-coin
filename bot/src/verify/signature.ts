import nacl from "tweetnacl";
import bs58 from "bs58";
import { verificationMessage } from "./message.js";

export { verificationMessage };

/** Verify an ed25519 signature over the verification message for `nonce`.
 *  `publicKey` and `signature` are base58 (Solana convention). */
export function verifySignature(
  nonce: string,
  publicKeyBase58: string,
  signatureBase58: string
): boolean {
  try {
    const message = new TextEncoder().encode(verificationMessage(nonce));
    const publicKey = bs58.decode(publicKeyBase58);
    const signature = bs58.decode(signatureBase58);
    if (publicKey.length !== 32 || signature.length !== 64) return false;
    return nacl.sign.detached.verify(message, signature, publicKey);
  } catch {
    return false;
  }
}
