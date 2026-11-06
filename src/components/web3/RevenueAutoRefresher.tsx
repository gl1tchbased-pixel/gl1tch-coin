"use client";

import { useEffect, useState, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";

export function RevenueAutoRefresher({ intervalMs = 20000 }: { intervalMs?: number }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [lastRefreshed, setLastRefreshed] = useState<string>("");

  const refresh = useCallback(() => {
    startTransition(() => {
      router.refresh();
      setLastRefreshed(new Date().toISOString().slice(11, 19) + " UTC");
    });
  }, [router]);

  useEffect(() => {
    setLastRefreshed(new Date().toISOString().slice(11, 19) + " UTC");
    const id = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        refresh();
      }
    }, intervalMs);

    const onVisibilityChange = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        refresh();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [refresh, intervalMs]);

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "8px",
        fontSize: "0.75rem",
        fontFamily: "var(--font-mono, monospace)",
        letterSpacing: "0.05em",
      }}
    >
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          color: isPending ? "var(--accent, #38bdf8)" : "var(--signal, #00ff88)",
          opacity: 0.95,
          transition: "color 0.2s ease",
        }}
        title={`Live on-chain & API revenue. Auto-refreshes every ${Math.round(intervalMs / 1000)}s.`}
      >
        <span
          style={{
            width: "6px",
            height: "6px",
            borderRadius: "50%",
            backgroundColor: isPending ? "var(--accent, #38bdf8)" : "var(--signal, #00ff88)",
            boxShadow: isPending ? "0 0 10px #38bdf8" : "0 0 8px var(--signal, #00ff88)",
            transition: "all 0.2s ease",
            transform: isPending ? "scale(1.2)" : "scale(1)",
          }}
        />
        {isPending ? "SYNCING…" : `SYNCED ${lastRefreshed || "LIVE"}`}
      </span>

      <button
        type="button"
        onClick={refresh}
        disabled={isPending}
        title="Refresh revenue and on-chain balances now"
        aria-label="Refresh live revenue"
        style={{
          background: "rgba(255, 255, 255, 0.05)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          borderRadius: "4px",
          padding: "2px 7px",
          color: "#94a3b8",
          fontSize: "0.7rem",
          cursor: isPending ? "wait" : "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: "4px",
          transition: "all 0.15s ease",
          lineHeight: 1.2,
        }}
        onMouseEnter={(e) => {
          if (!isPending) {
            e.currentTarget.style.color = "#f8fafc";
            e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.25)";
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = "#94a3b8";
          e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.12)";
        }}
      >
        <span
          style={{
            display: "inline-block",
            transform: isPending ? "rotate(360deg)" : "none",
            transition: isPending ? "transform 0.6s linear" : "none",
          }}
        >
          ⟳
        </span>
        {isPending ? "Syncing" : "Refresh"}
      </button>
    </div>
  );
}
