import fs from "node:fs";
import path from "node:path";

/**
 * Agent registry (Agent Trust Layer v0). Holds agent-specific trust data — verified identity,
 * attestations, disputes — keyed by chain:wallet. The deploy track record comes live from the
 * Signal Graph; wallet age from a scan. Durable on the Railway volume (auto-detected mount).
 */

export interface AgentRecord {
  agentId: string; // wallet address
  chain: string;
  label: string; // optional human/agent name
  verified: boolean; // proved ownership via signature
  verifiedAt: number | null;
  attestations: number;
  disputes: number;
  registeredAt: number;
  updatedAt: number;
}

const VOLUME = process.env.RAILWAY_VOLUME_MOUNT_PATH;
const STORE_PATH =
  process.env.AGENT_TRUST_FILE ??
  (VOLUME ? path.join(VOLUME, "gl1tch-agent-trust.json") : "/tmp/gl1tch-agent-trust.json");

const key = (chain: string, id: string) => `${chain}:${id}`;

export class AgentTrustStore {
  private byAgent = new Map<string, AgentRecord>();
  private loaded = false;

  load(): void {
    if (this.loaded) return;
    this.loaded = true;
    try {
      const parsed = JSON.parse(fs.readFileSync(STORE_PATH, "utf-8")) as { agents?: AgentRecord[] };
      for (const a of parsed.agents ?? []) this.byAgent.set(key(a.chain, a.agentId), a);
      console.log(`[agent-trust] loaded ${this.byAgent.size} agents from ${STORE_PATH}`);
    } catch {
      console.log(`[agent-trust] no registry at ${STORE_PATH} (starting empty)`);
    }
  }

  private save(): void {
    try {
      fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
      fs.writeFileSync(STORE_PATH, JSON.stringify({ agents: [...this.byAgent.values()] }));
    } catch (e) {
      console.error("[agent-trust] save failed:", (e as Error).message);
    }
  }

  get(agentId: string, chain: string): AgentRecord | undefined {
    return this.byAgent.get(key(chain, agentId));
  }

  /** Register or update an agent's identity (verified once ownership is proven). */
  register(agentId: string, chain: string, opts: { label?: string; verified?: boolean } = {}): AgentRecord {
    const k = key(chain, agentId);
    const now = Date.now();
    const prev = this.byAgent.get(k);
    const rec: AgentRecord = {
      agentId,
      chain,
      label: opts.label ?? prev?.label ?? "",
      verified: opts.verified ?? prev?.verified ?? false,
      verifiedAt: (opts.verified ?? prev?.verified) ? (prev?.verifiedAt ?? now) : null,
      attestations: prev?.attestations ?? 0,
      disputes: prev?.disputes ?? 0,
      registeredAt: prev?.registeredAt ?? now,
      updatedAt: now,
    };
    this.byAgent.set(k, rec);
    this.save();
    return rec;
  }

  size(): number {
    return this.byAgent.size;
  }
}

export const agentTrustStore = new AgentTrustStore();
