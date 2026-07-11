/**
 * Public buyback→burn ledger data. Each entry is a RECORD OF A REAL, ALREADY-EXECUTED
 * on-chain event (see gl1tch-buyback-runbook.md) — never a promise or a projection.
 *
 * CURRENT STATE: empty. Value accrual is designed and staged, NOT live — it activates only
 * once real revenue exists (≥3 months) + a third-party audit + founder approval. The page
 * renders an honest "no buybacks yet" state until a real entry is appended by the founder.
 * Do NOT add an entry for anything that did not actually happen on-chain.
 */

export interface Buyback {
  date: string; // ISO date of the burn
  revenueUsd: number; // revenue (project, not user funds) that funded this cycle
  glitchBurned: number; // $GL1TCH burned
  buyTx: string; // public buy transaction signature (Solscan)
  burnTx: string; // public burn transaction signature (Solscan)
  note?: string;
}

export const BUYBACKS: Buyback[] = [];

export interface BuybackTotals {
  cycles: number;
  glitchBurned: number;
  revenueUsd: number;
  latest: string | null;
}

export function buybackTotals(rows: Buyback[] = BUYBACKS): BuybackTotals {
  return {
    cycles: rows.length,
    glitchBurned: rows.reduce((s, r) => s + (r.glitchBurned || 0), 0),
    revenueUsd: rows.reduce((s, r) => s + (r.revenueUsd || 0), 0),
    latest: rows.length ? rows[0].date : null,
  };
}
