import { describe, it, expect } from "vitest";
import nacl from "tweetnacl";
import bs58 from "bs58";
import { agentRegMessage, verifyAgentRegistration } from "./register.js";

function signAs(kp: nacl.SignKeyPair, address: string, issued: number) {
  const msg = new TextEncoder().encode(agentRegMessage(address, issued));
  return bs58.encode(nacl.sign.detached(msg, kp.secretKey));
}

describe("verifyAgentRegistration", () => {
  const kp = nacl.sign.keyPair();
  const address = bs58.encode(kp.publicKey);
  const now = 1_000_000_000;

  it("accepts a fresh, correctly-signed registration", () => {
    const signature = signAs(kp, address, now);
    expect(verifyAgentRegistration({ address, issued: now, signature }, now)).toEqual({ ok: true });
  });

  it("rejects a stale message (>10 min old)", () => {
    const signature = signAs(kp, address, now);
    const r = verifyAgentRegistration({ address, issued: now, signature }, now + 11 * 60_000);
    expect(r).toEqual({ ok: false, error: "stale" });
  });

  it("rejects a signature from a different key", () => {
    const other = nacl.sign.keyPair();
    const signature = signAs(other, address, now); // signed by someone else for this address
    const r = verifyAgentRegistration({ address, issued: now, signature }, now);
    expect(r).toEqual({ ok: false, error: "bad_signature" });
  });

  it("rejects malformed input", () => {
    expect(verifyAgentRegistration({ address: "", issued: now, signature: "x" }, now).ok).toBe(false);
    expect(verifyAgentRegistration({ address, issued: now, signature: "not-base58!!" }, now).ok).toBe(false);
  });
});
