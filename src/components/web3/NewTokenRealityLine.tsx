"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { realityChainOf } from "@/lib/token-reality/view";

/**
 * Under a scan of a token younger than three days: that chain's measured base rate (New Token Reality). Renders
 * nothing until a number is published (enough launches measured), so it never shows a made-up or empty figure.
 */
export function isYoungAge(ageValue: string | undefined): boolean {
  return ageValue === "< 24 hours" || ageValue === "1 day" || ageValue === "2 days";
}

export function NewTokenRealityLine({ chain, ageValue }: { chain: string; ageValue: string | undefined }) {
  const [line, setLine] = useState<string | null>(null);
  const rc = realityChainOf(chain);
  const young = isYoungAge(ageValue);

  useEffect(() => {
    if (!rc || !young) return;
    let alive = true;
    fetch(`/api/token-reality?chain=${rc}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { headline?: string | null } | null) => {
        if (alive && j?.headline) setLine(j.headline);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [rc, young]);

  if (!line) return null;
  return (
    <p style={{ margin: "var(--space-3) 0 0", padding: "10px 14px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", fontSize: "0.88rem", lineHeight: 1.55, color: "var(--text-secondary)" }}>
      <strong style={{ color: "var(--warn)" }}>New token reality:</strong> {line}{" "}
      <Link href="/new-token-reality" style={{ color: "var(--color-signal)" }}>How we measure →</Link>
    </p>
  );
}
