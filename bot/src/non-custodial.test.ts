import { describe, it, expect } from "vitest";
import { apiKeyMessage } from "./api-keys/keys.js";
import { drawEntryMessage } from "./quantum-core/enter.js";
import { agentRegMessage } from "./agent-trust/register.js";

/**
 * I1 — NON-CUSTODIAL invariant, test-enforced at the surface that matters: every message
 * GL1TCH ever asks a wallet to SIGN must (a) state plainly that it moves no funds and grants
 * no access, and (b) never contain a fund-moving verb. If a future change asks users to sign
 * a transfer/approval, this suite fails — which is exactly the guardrail the audit-readiness
 * package (§B.3, I1) requires. (See gl1tch-value-accrual-and-audit-readiness.md.)
 */

const MESSAGES: Array<{ name: string; text: string }> = [
  { name: "apiKeyMessage", text: apiKeyMessage("Wallet1111111111111111111111111111111111111", 1_700_000_000_000) },
  { name: "drawEntryMessage", text: drawEntryMessage("Wallet1111111111111111111111111111111111111", "draw-1", 1_700_000_000_000) },
  { name: "agentRegMessage", text: agentRegMessage("Wallet1111111111111111111111111111111111111", 1_700_000_000_000) },
];

// Verbs that would indicate a fund-moving / approval signature (must NEVER appear).
const FORBIDDEN = /\b(transfer|approve|approval|spend|withdraw|send funds|delegate authority|setAuthority|permit)\b/i;

describe("I1 — every signed message is non-custodial", () => {
  for (const m of MESSAGES) {
    it(`${m.name} declares it moves no funds and grants no access`, () => {
      expect(m.text.toLowerCase()).toContain("moves no funds");
      expect(m.text.toLowerCase()).toContain("grants no access");
    });
    it(`${m.name} contains no fund-moving verb`, () => {
      expect(FORBIDDEN.test(m.text)).toBe(false);
    });
    it(`${m.name} binds the wallet address (ownership proof, not a blank sign)`, () => {
      expect(m.text).toContain("Wallet1111111111111111111111111111111111111");
    });
  }
});
