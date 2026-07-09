/**
 * Quantum Seal — HYBRID post-quantum encryption (X25519 + ML-KEM-768).
 *
 * Defense in depth: the AES-256 key is derived from BOTH a classical X25519 ECDH
 * shared secret AND an ML-KEM-768 (FIPS 203) encapsulated secret, combined with
 * HKDF-SHA256. An attacker must break BOTH to recover plaintext:
 *   • classical cryptanalysis alone can't — ML-KEM still protects;
 *   • a quantum computer alone can't — X25519 is only one of two layers.
 * This is the same X25519MLKEM768 hybrid now shipped in TLS 1.3 by Chrome,
 * Cloudflare and AWS. We do NOT roll our own primitives.
 *
 * The KEM shared secrets are the ONLY key material (no external randomness beacon
 * is ever used as a key). AES-GCM additionally authenticates the algorithm id and
 * both ciphertexts as AAD, so a record can't be silently downgraded or spliced.
 * Decryption runs client-side, so a server compromise never sees plaintext.
 */
import { ml_kem768 } from "@noble/post-quantum/ml-kem.js";
import { x25519 } from "@noble/curves/ed25519.js";
import { hkdf } from "@noble/hashes/hkdf.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, hexToBytes, utf8ToBytes, concatBytes } from "@noble/hashes/utils.js";

const bytesToUtf8 = (b: Uint8Array): string => new TextDecoder().decode(b);

const ALG = "x25519+ml-kem-768+aes-256-gcm" as const;
const X25519_LEN = 32; // X25519 public and secret keys are both 32 bytes
const HKDF_INFO = utf8ToBytes("gl1tch/quantum-seal/x25519mlkem768/aes-256-gcm/v2");

export interface SealKeypair {
  publicKey: string; // hex — X25519 pub (32B) ‖ ML-KEM-768 encapsulation key
  secretKey: string; // hex — X25519 sec (32B) ‖ ML-KEM-768 decapsulation key — keep client-side
}

export interface SealedRecord {
  alg: typeof ALG;
  ephPub: string; // hex — ephemeral X25519 public key (classical leg)
  kemCt: string; // hex — ML-KEM ciphertext (post-quantum leg)
  iv: string; // hex — AES-GCM nonce
  ciphertext: string; // hex — AES-GCM(ciphertext‖tag)
}

const subtle = (): SubtleCrypto => {
  const c = (globalThis as { crypto?: Crypto }).crypto;
  if (!c?.subtle) throw new Error("WebCrypto unavailable");
  return c.subtle;
};

const randomBytes = (n: number): Uint8Array =>
  (globalThis.crypto as Crypto).getRandomValues(new Uint8Array(n));

export function sealKeypair(): SealKeypair {
  const xSec = x25519.utils.randomPrivateKey();
  const xPub = x25519.getPublicKey(xSec);
  const { publicKey: kPub, secretKey: kSec } = ml_kem768.keygen();
  return {
    publicKey: bytesToHex(concatBytes(xPub, kPub)),
    secretKey: bytesToHex(concatBytes(xSec, kSec)),
  };
}

/** Hybrid combiner: HKDF-SHA256 over (X25519 ss ‖ ML-KEM ss) → 256-bit AES key. */
async function aesKey(ssClassical: Uint8Array, ssPq: Uint8Array): Promise<CryptoKey> {
  const ikm = concatBytes(ssClassical, ssPq);
  const raw = hkdf(sha256, ikm, undefined, HKDF_INFO, 32);
  return subtle().importKey("raw", raw as unknown as ArrayBuffer, { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt",
  ]);
}

const aad = (ephPub: Uint8Array, kemCt: Uint8Array): Uint8Array =>
  concatBytes(utf8ToBytes(ALG), ephPub, kemCt);

/** Encrypt a UTF-8 string to the holder of `publicKey` (hybrid X25519 + ML-KEM). */
export async function seal(publicKeyHex: string, plaintext: string): Promise<SealedRecord> {
  const pub = hexToBytes(publicKeyHex);
  const xPub = pub.slice(0, X25519_LEN);
  const kPub = pub.slice(X25519_LEN);

  // Classical leg: ephemeral X25519 ECDH.
  const ephSec = x25519.utils.randomPrivateKey();
  const ephPub = x25519.getPublicKey(ephSec);
  const ssClassical = x25519.getSharedSecret(ephSec, xPub);

  // Post-quantum leg: ML-KEM-768 encapsulation.
  const { cipherText: kemCt, sharedSecret: ssPq } = ml_kem768.encapsulate(kPub);

  const key = await aesKey(ssClassical, ssPq);
  const iv = randomBytes(12);
  const ct = new Uint8Array(
    await subtle().encrypt(
      {
        name: "AES-GCM",
        iv: iv as unknown as ArrayBuffer,
        additionalData: aad(ephPub, kemCt) as unknown as ArrayBuffer,
      },
      key,
      utf8ToBytes(plaintext) as unknown as ArrayBuffer
    )
  );
  return {
    alg: ALG,
    ephPub: bytesToHex(ephPub),
    kemCt: bytesToHex(kemCt),
    iv: bytesToHex(iv),
    ciphertext: bytesToHex(ct),
  };
}

/** Decrypt a sealed record with the matching secret key (run client-side). */
export async function unseal(secretKeyHex: string, rec: SealedRecord): Promise<string> {
  const sec = hexToBytes(secretKeyHex);
  const xSec = sec.slice(0, X25519_LEN);
  const kSec = sec.slice(X25519_LEN);
  const ephPub = hexToBytes(rec.ephPub);
  const kemCt = hexToBytes(rec.kemCt);

  const ssClassical = x25519.getSharedSecret(xSec, ephPub);
  const ssPq = ml_kem768.decapsulate(kemCt, kSec);

  const key = await aesKey(ssClassical, ssPq);
  const pt = new Uint8Array(
    await subtle().decrypt(
      {
        name: "AES-GCM",
        iv: hexToBytes(rec.iv) as unknown as ArrayBuffer,
        additionalData: aad(ephPub, kemCt) as unknown as ArrayBuffer,
      },
      key,
      hexToBytes(rec.ciphertext) as unknown as ArrayBuffer
    )
  );
  return bytesToUtf8(pt);
}
