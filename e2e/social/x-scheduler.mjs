// $GL1TCH X growth scheduler — start once, leave running. Each cycle:
//   1) posts today's curated tweet (self-skips if already posted today)
//   2) runs the helpful-reply engine (rate-limited, safe)
// then sleeps REPLY_INTERVAL_HOURS.
//   NODE_OPTIONS=--use-system-ca LAUNCH_CHROMIUM=1 node e2e/social/x-scheduler.mjs
// Env: REPLY_INTERVAL_HOURS (default 3 — hourly is riskier for the account), MAX (replies/run),
//      DRY=1 (dry-run everything). Runs the two child scripts sequentially so only one browser
//      window is ever open at a time. Ctrl-C to stop.
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DIR = path.dirname(fileURLToPath(import.meta.url));
const INTERVAL_MS = Math.max(1, Number(process.env.REPLY_INTERVAL_HOURS || 3)) * 3600_000;

function run(script) {
  return new Promise((resolve) => {
    console.log(`\n[sched] ▶ ${script} @ ${new Date().toISOString()}`);
    const child = spawn(process.execPath, [path.resolve(DIR, script)], {
      stdio: "inherit",
      env: { ...process.env, NODE_OPTIONS: "--use-system-ca", LAUNCH_CHROMIUM: "1" },
    });
    child.on("exit", (code) => { console.log(`[sched] ✔ ${script} exited ${code}`); resolve(code); });
    child.on("error", (e) => { console.log(`[sched] ✖ ${script} error ${e.message}`); resolve(1); });
  });
}

async function cycle() {
  await run("x-daily.mjs");   // idempotent — only posts once/day
  await run("x-reply.mjs");   // rate-limited helpful replies
}

console.log(`[sched] GL1TCH X scheduler online · reply cycle every ${INTERVAL_MS / 3600000}h · MAX=${process.env.MAX || 3}${process.env.DRY === "1" ? " · DRY" : ""}`);
console.log("[sched] leave this window running. Ctrl-C to stop.");

// run immediately, then on the interval
await cycle();
// eslint-disable-next-line no-constant-condition
while (true) {
  await new Promise((r) => setTimeout(r, INTERVAL_MS));
  await cycle().catch((e) => console.log("[sched] cycle error:", e.message));
}
