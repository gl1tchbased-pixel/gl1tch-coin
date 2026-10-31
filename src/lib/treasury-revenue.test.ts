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

  it("includes verified CollectCreatorFee claims and the revenue channels", () => {
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
      "blinks",
      "sentinel",
      "yield-spikes",
    ]);
  });

  it("shows no number, never a made-up one, when RPC endpoints fail", async () => {
    const origFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("offline"));
    try {
      const snap = await getTreasurySnapshot();
      expect(snap.solanaSol).toBeNull();
      expect(snap.solanaUsdc).toBeNull();
      expect(snap.baseUsdc).toBeNull();
      expect(snap.totalUsdc).toBeNull();
      expect(snap.creatorVaultClaimableSol).toBeNull();
      expect(snap.feeVaultSol).toBeNull();
      expect(snap.creatorClaimedSol).toBeCloseTo(0.021286431, 6);
      expect(snap.channels).toHaveLength(9);
    } finally {
      globalThis.fetch = origFetch;
    }
  });

  it("reads live balances, including a real zero and the fee vault", async () => {
    const origFetch = globalThis.fetch;
    const results: Record<string, unknown> = {
      getBalance: { value: 92_183_200 },
      getTokenAccountsByOwner: { value: [] },
      getTokenAccountBalance: { value: { uiAmount: 0.25 } },
      eth_call: "0x" + (10_000).toString(16).padStart(64, "0"),
    };
    globalThis.fetch = vi.fn(async (_url: unknown, init?: { body?: string }) => {
      const { method } = JSON.parse(init?.body ?? "{}") as { method: string };
      return new Response(JSON.stringify({ result: results[method] }));
    }) as unknown as typeof fetch;
    try {
      const snap = await getTreasurySnapshot();
      expect(snap.solanaSol).toBeCloseTo(0.0921832, 7);
      expect(snap.solanaUsdc).toBe(0);
      expect(snap.baseUsdc).toBeCloseTo(0.01, 6);
      expect(snap.totalUsdc).toBeCloseTo(0.01, 6);
      expect(snap.feeVault).toBe("DqKd8TtLf9m8dkg81K6XNVg5CGB9uMHVSQKQn9qNjYTU");
      expect(snap.feeVaultSol).toBe(0.25);
    } finally {
      globalThis.fetch = origFetch;
    }
  });
});

