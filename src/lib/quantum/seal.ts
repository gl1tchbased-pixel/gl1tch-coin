/**
 * Quantum Seal — post-quantum hybrid encryption (spec §8, §18B.3).
 *
 * ML-KEM-768 (FIPS 203, @noble/post-quantum) encapsulates a shared secret; that
 * secret keys AES-256-GCM (WebCrypto) to encrypt the payload. Hybrid KEM+AEAD is
 * the standard post-quantum pattern. We do NOT roll our own primitives.
 *
 * CURBy/ANU output is NEVER used as key material here (spec §7.1) — keys come
 * only from ML-KEM encapsulation. Decryption is meant to run client-side, so a
 * server compromise never sees plaintext (spec §14.7).
 */
import { ml_kem768 } from "@noble/post-quantum/ml-kem.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, hexToBytes, utf8ToBytes } from "@noble/hashes/utils.js";

const bytesToUtf8 = (b: Uint8Array): string => new TextDecoder().decode(b);

export interface SealKeypair {
  publicKey: string; // hex (ML-KEM-768 encapsulation key)
  secretKey: string; // hex (ML-KEM-768 decapsulation key) — keep client-side
}

export interface SealedRecord {
  alg: "ml-kem-768+aes-256-gcm";
  kemCt: string; // hex — ML-KEM ciphertext (encapsulated secret)
  iv: string; // hex — AES-GCM nonce
  ciphertext: string; // hex — AES-GCM(ciphertext||tag)
}

const subtle = (): SubtleCrypto => {
  const c = (globalThis as { crypto?: Crypto }).crypto;
  if (!c?.subtle) throw new Error("WebCrypto unavailable");
  return c.subtle;
};

export function sealKeypair(): SealKeypair {
  const { publicKey, secretKey } = ml_kem768.keygen();
  return { publicKey: bytesToHex(publicKey), secretKey: bytesToHex(secretKey) };
}

async function aesKey(sharedSecret: Uint8Array): Promise<CryptoKey> {
  // Derive a 256-bit AES key deterministically from the KEM shared secret.
  const raw = sha256(sharedSecret);
  return subtle().importKey("raw", raw as unknown as ArrayBuffer, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

/** Encrypt a UTF-8 string to the holder of `publicKey`. */
export async function seal(publicKeyHex: string, plaintext: string): Promise<SealedRecord> {
  const { cipherText, sharedSecret } = ml_kem768.encapsulate(hexToBytes(publicKeyHex));
  const key = await aesKey(sharedSecret);
  const iv = (globalThis.crypto as Crypto).getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(
    await subtle().encrypt({ name: "AES-GCM", iv }, key, utf8ToBytes(plaintext) as unknown as ArrayBuffer)
  );
  return {
    alg: "ml-kem-768+aes-256-gcm",
    kemCt: bytesToHex(cipherText),
    iv: bytesToHex(iv),
    ciphertext: bytesToHex(ct),
  };
}

/** Decrypt a sealed record with the matching secret key (run client-side). */
export async function unseal(secretKeyHex: string, rec: SealedRecord): Promise<string> {
  const sharedSecret = ml_kem768.decapsulate(hexToBytes(rec.kemCt), hexToBytes(secretKeyHex));
  const key = await aesKey(sharedSecret);
  const pt = new Uint8Array(
    await subtle().decrypt(
      { name: "AES-GCM", iv: hexToBytes(rec.iv) },
      key,
      hexToBytes(rec.ciphertext) as unknown as ArrayBuffer
    )
  );
  return bytesToUtf8(pt);
}
