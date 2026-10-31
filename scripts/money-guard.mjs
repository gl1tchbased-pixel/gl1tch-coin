#!/usr/bin/env node
/**
 * Stops a build (npm prebuild, so every deploy path) and CI when site or bot code can ask a wallet to move funds or
 * signs a transaction outside the attester. Red CI alone doesn't stop a `vercel --prod`; a failed build does.
 * See docs/threat-model.md, core invariant 1.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const FUND_CALLS = /eth_sendTransaction|sendTransaction\(|setApprovalForAll|increaseAllowance|\.approve\(|signAndSendTransaction/;
const SIGNING_CALLS = /sendRawTransaction|sendAndConfirm|Keypair\.fromSecretKey|signTransaction|signAllTransactions|\.sign\(\[/;
const ATTESTER_DIR = "bot/src/attest/";

/** Pure: `files` maps a repo-relative path with forward slashes to its text. */
export function moneyGuardProblems(files) {
  const problems = [];
  for (const [file, text] of Object.entries(files)) {
    text.split("\n").forEach((line, i) => {
      if (FUND_CALLS.test(line)) problems.push(`${file}:${i + 1} asks for a fund or approval signature`);
      else if (SIGNING_CALLS.test(line) && !file.startsWith(ATTESTER_DIR)) problems.push(`${file}:${i + 1} signs outside the attester`);
    });
  }
  return problems;
}

function readSources(root, dir, out = {}) {
  const full = path.join(root, dir);
  if (!fs.existsSync(full)) return out;
  for (const entry of fs.readdirSync(full, { withFileTypes: true })) {
    const rel = `${dir}/${entry.name}`;
    if (entry.isDirectory()) readSources(root, rel, out);
    else if (/\.tsx?$/.test(entry.name)) out[rel] = fs.readFileSync(path.join(root, rel), "utf8");
  }
  return out;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const problems = moneyGuardProblems({ ...readSources(root, "src"), ...readSources(root, "bot/src") });
  if (problems.length > 0) {
    console.error(`[money-guard] refused:\n  ${problems.join("\n  ")}`);
    process.exit(1);
  }
  console.log("[money-guard] OK: no fund or approval signature calls, signing only in the attester.");
}
