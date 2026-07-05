/**
 * Agent Trust Layer v0 (GL1TCH pivot to the AI-agent economy) — pure scoring logic.
 *
 * The 2026 agent economy has no trust layer: agents transact autonomously and nobody can
 * verify one is legit, reputable, or acting in bounds ("bounded autonomy", agent identity,
 * reputation registry — the missing stack). GL1TCH already built these primitives for TOKENS
 * (Signal Graph = reputation, scanner = guardrail, verify = identity); here we point them at
 * AGENTS (on-chain wallets that act autonomously).
 *
 * An Agent Trust Score answers: "is it safe to transact with / hire / let this agent touch
 * funds?" Pure + unit-tested; persistence + on-chain lookups live elsewhere.
 */

export type TrustLevel = "unknown" | "caution" | "neutral" | "trusted";

/** Signals we can observe about an agent wallet (assembled by the store/API layer). */
export interface AgentSignals {
  verified: boolean; // proved wallet ownership via signature (identity)
  flaggedDeploys: number; // tokens THIS wallet deployed that we scored high-risk (Signal Graph)
  totalDeploys: number; // tokens we've seen it deploy
  ageDays: number | null; // wallet age; null = unknown
  attestations: number; // positive attestations accrued over time (v1+)
  disputes: number; // disputes/negative reports
}

export interface AgentTrust {
  score: number; // 0-100 trust
  level: TrustLevel;
  reasons: string[]; // plain-language, probabilistic (never accusatory)
}

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

/**
 * Score an agent from its signals. Starts neutral; identity + clean track record + age raise
 * it; deploying flagged tokens or disputes sink it. Deliberately conservative: an unknown,
 * unverified, brand-new wallet is NOT "trusted" — absence of proof is not proof.
 */
export function agentTrust(s: AgentSignals): AgentTrust {
  const reasons: string[] = [];
  let score = 50; // neutral prior

  if (s.verified) { score += 12; reasons.push("Identity verified — proved ownership of this wallet by signature."); }
  else { score -= 6; reasons.push("Unverified — this wallet has not proved its identity to GL1TCH."); }

  // Track record via the Signal Graph (the moat): repeat rug deployers are the strongest signal.
  if (s.flaggedDeploys >= 2) { score -= 45; reasons.push(`This wallet deployed ${s.flaggedDeploys} tokens we flagged as high-risk — serial-rug behaviour. Do not let it touch funds.`); }
  else if (s.flaggedDeploys === 1) { score -= 22; reasons.push("This wallet deployed a token we flagged as high-risk — treat with caution."); }
  else if (s.totalDeploys >= 2) { score += 8; reasons.push(`Deployed ${s.totalDeploys} tokens we've seen, none flagged high-risk.`); }

  if (s.ageDays != null) {
    if (s.ageDays < 3) { score -= 12; reasons.push("Wallet is brand new (<3 days) — no history to trust yet."); }
    else if (s.ageDays > 90) { score += 8; reasons.push("Established wallet (>90 days) with on-chain history."); }
  } else {
    reasons.push("Wallet age unknown.");
  }

  score += Math.min(15, s.attestations * 3); // positive attestations, capped
  score -= Math.min(30, s.disputes * 10); // disputes bite harder
  if (s.attestations > 0) reasons.push(`${s.attestations} positive attestation(s) from the network.`);
  if (s.disputes > 0) reasons.push(`${s.disputes} dispute(s) reported against this agent.`);

  score = clamp(score);
  const level: TrustLevel =
    s.flaggedDeploys === 0 && !s.verified && s.ageDays == null && s.totalDeploys === 0 && s.attestations === 0 && s.disputes === 0
      ? "unknown" // literally no signal
      : score >= 70 ? "trusted"
      : score >= 45 ? "neutral"
      : "caution";

  if (level === "unknown") reasons.unshift("No trust signal yet — GL1TCH has never seen this agent. Absence of a flag is not a safety guarantee.");
  return { score, level, reasons };
}
