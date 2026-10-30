import { describe, expect, it, vi } from "vitest";
import {
  computeClaimableVaultSol,
  getTreasurySnapshot,
  PUMP_CREATOR_VAULT_PDA,
  REVENUE_CHANNELS,
  VERIFIED_CREATOR_CLAIMS,
} from "./treasury-revenue";

describe("treasury-revenue", () => {
  it("computes claimable SOL above rent-exempt threshold", () => {
    expect(computeClaimableVaultSol(650_240)).toBe(0);
    expect(computeClaimableVaultSol(890_880)).toBe(0);
    expect(computeClaimableVaultSol(22_177_311)).toBeCloseTo(0.021286431, 8);
  });

  it("includes verified CollectCreatorFee claims and 10 live revenue channels", () => {
    expect(VERIFIED_CREATOR_CLAIMS.length).toBeGreaterThanOrEqual(1);
    expect(VERIFIED_CREATOR_CLAIMS[0].tx).toBe(
      "3LN23qxyutDXXLjTKczRYUzjfazs1BvoL6CHmwXnzaz7ydzixFY1rKQxmFiUuwhYTY6VwWwCxQAhdTVYxR1LrQBo"
    );
    expect(VERIFIED_CREATOR_CLAIMS[0].vaultPda).toBe(PUMP_CREATOR_VAULT_PDA);
    expect(REVENUE_CHANNELS.map((c) => c.id)).toEqual([
      "x402",
      "creator-fees",
      "guardian",
      "giveaway",
      "agent-kit",
      "apify",
      "virtuals-acp",
      "blinks",
      "sentinel",
      "yield-spikes",
    ]);
  });

  it("falls back cleanly when RPC endpoints fail", async () => {
    const origFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("offline"));
    try {
      const snap = await getTreasurySnapshot();
      expect(snap.solanaSol).toBeGreaterThan(0.04);
      expect(snap.totalUsdc).toBeGreaterThan(5.6);
      expect(snap.creatorClaimedSol).toBeCloseTo(0.021286431, 6);
      expect(snap.channels).toHaveLength(10);
    } finally {
      globalThis.fetch = origFetch;
    }
  });
});

