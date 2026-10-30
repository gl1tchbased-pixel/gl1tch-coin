"use client";

import { useCallback, useState } from "react";
import {
  ZKAP_MIN_HOLDING,
  generateZKHolderProof,
  type ZKHolderProof,
} from "@/lib/zk/zkap";

export interface ZKGlitchAuthState {
  status: "idle" | "proving" | "verifying" | "verified" | "error";
  proof: ZKHolderProof | null;
  nullifier: string | null;
  error: string | null;
  proveAndVerify: (wallet: string, balance: number) => Promise<boolean>;
  reset: () => void;
}

/**
 * Client-side React hook (`useZKGlitchAuth`) that constructs a zero-knowledge
 * holder proof for >= 100,000 $GL1TCH in the browser and verifies it with `/api/zk/verify`
 * without transmitting the wallet address or exact token balance.
 */
export function useZKGlitchAuth(threshold = ZKAP_MIN_HOLDING): ZKGlitchAuthState {
  const [status, setStatus] = useState<ZKGlitchAuthState["status"]>("idle");
  const [proof, setProof] = useState<ZKHolderProof | null>(null);
  const [nullifier, setNullifier] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const proveAndVerify = useCallback(
    async (wallet: string, balance: number): Promise<boolean> => {
      setStatus("proving");
      setError(null);
      try {
        const generated = await generateZKHolderProof({ wallet, balance, threshold });
        setProof(generated);
        setStatus("verifying");

        const res = await fetch("/api/zk/verify", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ proof: generated }),
        });
        const data = await res.json();
        if (!res.ok || !data?.valid) {
          throw new Error(data?.reason || data?.error || "ZK verification failed");
        }
        setNullifier(data.nullifier ?? generated.nullifier);
        setStatus("verified");
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : "ZK proof failed");
        setStatus("error");
        return false;
      }
    },
    [threshold],
  );

  const reset = useCallback(() => {
    setStatus("idle");
    setProof(null);
    setNullifier(null);
    setError(null);
  }, []);

  return { status, proof, nullifier, error, proveAndVerify, reset };
}

