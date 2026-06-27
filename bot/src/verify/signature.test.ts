import { describe, it, expect } from "vitest";
import nacl from "tweetnacl";
import bs58 from "bs58";
import { verificationMessage, verifySignature } from "./signature.js";

function sign(nonce: string) {
  const kp = nacl.sign.keyPair();
  const msg = new TextEncoder().encode(verificationMessage(nonce));
  const sig = nacl.sign.detached(msg, kp.secretKey);
  return {
    publicKey: bs58.encode(kp.publicKey),
    signature: bs58.encode(sig),
  };
}

describe("verifySignature", () => {
  it("accepts a valid signature over the nonce message", () => {
    const nonce = "abc123";
    const { publicKey, signature } = sign(nonce);
    expect(verifySignature(nonce, publicKey, signature)).toBe(true);
  });

  it("rejects a signature checked against a different nonce", () => {
    const { publicKey, signature } = sign("nonce-A");
    expect(verifySignature("nonce-B", publicKey, signature)).toBe(false);
  });

  it("rejects a signature from a different key", () => {
    const nonce = "abc123";
    const { signature } = sign(nonce);
    const other = sign(nonce);
    expect(verifySignature(nonce, other.publicKey, signature)).toBe(false);
  });

  it("rejects malformed base58 input", () => {
    expect(verifySignature("n", "not-base58!!", "also-bad")).toBe(false);
  });
});
