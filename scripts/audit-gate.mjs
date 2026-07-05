// Dependency-audit gate (Phase -1, PREMIUM-PLAN-v3). Reads `npm audit --json` and fails on
// any high/critical advisory whose GHSA id is NOT allow-listed. The allow-list holds the two
// known, unfixable transitive advisories from @solana/web3.js@1.x (tracked in
// docs/risk-register.md); any NEW advisory in any other package fails the build.
import fs from "node:fs";

const ALLOW = new Set([
  "GHSA-3gc7-fjrx-p6mg", // bigint-buffer — buffer overflow, no upstream fix
  "GHSA-848j-6mx2-7j84", // elliptic — risky crypto primitive (web3.js internal)
]);

let audit;
try {
  audit = JSON.parse(fs.readFileSync("audit.json", "utf8"));
} catch (e) {
  console.error("could not read audit.json:", e.message);
  process.exit(2);
}

const bad = new Map(); // GHSA id -> "name (severity)"
for (const v of Object.values(audit.vulnerabilities || {})) {
  if (!["high", "critical"].includes(v.severity)) continue;
  for (const via of v.via || []) {
    if (typeof via === "object" && via.url) {
      const id = String(via.url).split("/").pop();
      if (!ALLOW.has(id)) bad.set(id, `${via.name} (${via.severity})`);
    }
  }
}

if (bad.size) {
  console.error("❌ Unallowed high/critical advisories found:");
  for (const [id, info] of bad) console.error(`   - ${id}  ${info}`);
  console.error("\nFix the dependency, or (if truly unfixable + low-risk) add to the allow-list");
  console.error("in scripts/audit-gate.mjs AND document it in docs/risk-register.md.");
  process.exit(1);
}
console.log("✅ Dependency audit gate passed (only allow-listed transitive advisories remain).");
