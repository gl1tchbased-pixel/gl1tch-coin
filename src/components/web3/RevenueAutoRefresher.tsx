"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function RevenueAutoRefresher({ intervalMs = 30000 }: { intervalMs?: number }) {
  const router = useRouter();
  const [lastRefreshed, setLastRefreshed] = useState<string>("");

  useEffect(() => {
    setLastRefreshed(new Date().toISOString().slice(11, 19) + " UTC");
    const id = setInterval(() => {
      router.refresh();
      setLastRefreshed(new Date().toISOString().slice(11, 19) + " UTC");
    }, intervalMs);
    return () => clearInterval(id);
  }, [router, intervalMs]);

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        fontSize: "0.75rem",
        color: "var(--signal, #00ff88)",
        fontFamily: "var(--font-mono, monospace)",
        letterSpacing: "0.05em",
        opacity: 0.9,
      }}
      title="Revenue and on-chain treasury balances auto-refresh every 30 seconds"
    >
      <span
        style={{
          width: "6px",
          height: "6px",
          borderRadius: "50%",
          backgroundColor: "var(--signal, #00ff88)",
          boxShadow: "0 0 8px var(--signal, #00ff88)",
        }}
      />
      SYNCED {lastRefreshed || "LIVE"}
    </span>
  );
}

