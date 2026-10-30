#!/usr/bin/env node
/**
 * Standalone runner for the GL1TCH Virtuals ACP Worker.
 * Can be run locally or under systemd on Oracle VM.
 */

import { Gl1tchAcpWorker } from "./acp-worker.mjs";

async function main() {
  const worker = new Gl1tchAcpWorker({
    gl1tchApiUrl: process.env.GL1TCH_API_URL || "https://gl1tchbased.xyz",
    treasuryAddress: process.env.VIRTUALS_TREASURY_ADDRESS,
    apiKey: process.env.GL1TCH_API_KEY,
  });

  const profile = worker.getProfile();
  console.log(`[acp-worker] Started ${profile.name} (ERC-8183 compliant)`);
  console.log(`[acp-worker] Network: ${profile.network} | Treasury: ${profile.treasuryAddress}`);
  console.log(`[acp-worker] Active services (${profile.services.length}):`, profile.services.map((s) => s.serviceId).join(", "));

  // If passed an ACP job payload via stdin or argv
  const rawJob = process.argv[2] || process.env.ACP_JOB;
  if (rawJob) {
    try {
      const job = JSON.parse(rawJob);
      const res = await worker.executeJob(job);
      console.log(JSON.stringify(res, null, 2));
    } catch (e) {
      console.error("[acp-worker] Job failed:", e.message);
      process.exit(1);
    }
  } else {
    console.log("[acp-worker] Daemon listening for incoming ACP jobs...");
  }
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});

