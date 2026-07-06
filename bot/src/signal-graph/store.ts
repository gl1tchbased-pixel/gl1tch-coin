import fs from "node:fs";
import path from "node:path";
import {
  applyObservation,
  reputation,
  deployerKey,
  type DeployerRecord,
  type DeployerReputation,
  type Observation,
} from "./graph.js";

/**
 * Durable Signal Graph store (PREMIUM-PLAN-v3, Phase 0). Keyed by chain:deployer, holds
 * every token sighting we've recorded. Durable by default on the Railway volume (auto-
 * detected mount — no manual env needed), so the graph compounds across restarts.
 */

const VOLUME = process.env.RAILWAY_VOLUME_MOUNT_PATH;
const STORE_PATH =
  process.env.SIGNAL_GRAPH_FILE ??
  (VOLUME ? path.join(VOLUME, "gl1tch-signal-graph.json") : "/tmp/gl1tch-signal-graph.json");

export class SignalGraphStore {
  private byDeployer = new Map<string, DeployerRecord>();
  private loaded = false;
  private dirty = false;

  load(): void {
    if (this.loaded) return;
    this.loaded = true;
    try {
      const parsed = JSON.parse(fs.readFileSync(STORE_PATH, "utf-8")) as {
        deployers?: DeployerRecord[];
      };
      for (const d of parsed.deployers ?? []) this.byDeployer.set(deployerKey(d.deployer, d.chain), d);
      console.log(`[signal] loaded ${this.byDeployer.size} deployers from ${STORE_PATH}`);
    } catch {
      console.log(`[signal] no signal graph at ${STORE_PATH} (starting empty)`);
    }
  }

  private save(): void {
    try {
      fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
      fs.writeFileSync(
        STORE_PATH,
        JSON.stringify({ deployers: [...this.byDeployer.values()] })
      );
      this.dirty = false;
    } catch (e) {
      console.error("[signal] save failed:", (e as Error).message);
    }
  }

  /** Record one scan observation and persist. Returns the post-write deployer record. */
  observe(obs: Observation): DeployerRecord {
    const k = deployerKey(obs.deployer, obs.chain);
    const next = applyObservation(this.byDeployer.get(k), obs);
    this.byDeployer.set(k, next);
    this.dirty = true;
    this.save();
    return next;
  }

  /** Reputation for a deployer, excluding the token currently being scanned. */
  reputationFor(deployer: string, chain: string, excludeMint?: string): DeployerReputation {
    const rec = this.byDeployer.get(deployerKey(deployer, chain));
    return reputation(rec, { excludeMint });
  }

  /** All deployers the graph has flagged as serial (>= `min` flagged tokens), worst first.
   *  This is the "caught a repeat rugger" feed powering the proof auto-share. */
  serialList(min = 2): DeployerReputation[] {
    const out: DeployerReputation[] = [];
    for (const rec of this.byDeployer.values()) {
      const rep = reputation(rec);
      if (rep.level === "serial" && rep.flaggedCount >= min) out.push(rep);
    }
    return out.sort((a, b) => b.flaggedCount - a.flaggedCount);
  }

  /** Deployers with >= `min` flagged tokens (worst first) — the "flagged actors" directory feed. */
  flaggedList(min = 1, limit = 30): DeployerReputation[] {
    const out: DeployerReputation[] = [];
    for (const rec of this.byDeployer.values()) {
      const rep = reputation(rec);
      if (rep.flaggedCount >= min) out.push(rep);
    }
    return out.sort((a, b) => b.flaggedCount - a.flaggedCount || (a.worstScore ?? 100) - (b.worstScore ?? 100)).slice(0, limit);
  }

  size(): number {
    return this.byDeployer.size;
  }
}

export const signalGraph = new SignalGraphStore();
