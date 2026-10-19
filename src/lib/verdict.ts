/** How the site reacts to a scanner verdict: ok (clean), warn (caution/unknown) or bad (rug risk). */
export type VerdictKind = "ok" | "warn" | "bad";

export function verdictKind(verdict: string): VerdictKind {
  const v = verdict.toUpperCase();
  if (v.includes("RUG") || v.includes("HIGH")) return "bad";
  if (v === "CLEAN" || v === "LOW RISK") return "ok";
  return "warn";
}
