/**
 * Agent Trust Layer client — the GL1TCH pivot to the AI-agent economy. Asks the bot (which
 * holds the agent registry + Signal Graph) for an agent wallet's trust assessment.
 */

const BASE = (process.env.SCAN_STATS_URL || "https://gl1tch-bot-production-3f2c.up.railway.app").replace(/\/$/, "");

export type TrustLevel = "unknown" | "caution" | "neutral" | "trusted";

export interface AgentAssessment {
  address: string;
  chain: string;
  score: number;
  level: TrustLevel;
  reasons: string[];
  registered: boolean;
  verified: boolean;
}

export interface DirectoryEntry {
  address: string;
  chain: string;
  label?: string;
  score?: number;
  level?: TrustLevel;
  verified?: boolean;
  flaggedCount?: number;
  tokensSeen?: number;
}

/** Public agent directory: verified registered agents + flagged on-chain actors. */
export async function agentDirectory(): Promise<{ verified: DirectoryEntry[]; flagged: DirectoryEntry[] }> {
  try {
    const r = await fetch(`${BASE}/signal/directory`, { signal: AbortSignal.timeout(6000), next: { revalidate: 60 } });
    if (!r.ok) return { verified: [], flagged: [] };
    const d = (await r.json()) as { ok?: boolean; verified?: DirectoryEntry[]; flagged?: DirectoryEntry[] };
    return { verified: d.verified ?? [], flagged: d.flagged ?? [] };
  } catch {
    return { verified: [], flagged: [] };
  }
}

/** The exact message an agent signs to register (must match the bot's agentRegMessage). */
export function agentRegMessage(address: string, issuedMs: number): string {
  return `GL1TCH Agent Registration\nWallet: ${address}\nIssued: ${issuedMs}\nThis proves wallet ownership. It moves no funds and grants no access.`;
}

export interface RegisterInput {
  address: string;
  chain?: string;
  issued: number;
  signature: string; // base58 ed25519 over agentRegMessage(address, issued)
  label?: string;
}

/** Forward a signed agent registration to the bot. Returns {ok, error?}. */
export async function registerAgent(input: RegisterInput): Promise<{ ok: boolean; error?: string }> {
  try {
    const r = await fetch(`${BASE}/signal/agent/register`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chain: "solana", ...input }),
      signal: AbortSignal.timeout(6000),
    });
    const d = (await r.json()) as { ok?: boolean; error?: string };
    return { ok: !!d.ok, error: d.error };
  } catch {
    return { ok: false, error: "unreachable" };
  }
}

/**
 * ERC-8004 (Trustless Agents) alignment. GL1TCH is an OFF-CHAIN, ERC-8004-*compatible* trust-signal
 * provider — we do not deploy the on-chain Identity Registry (ERC-721); we emit registration files
 * and reputation feedback in the ERC-8004 shape so agents/frameworks that already speak the standard
 * can consume GL1TCH signals directly. Ref: https://eips.ethereum.org/EIPS/eip-8004
 */
export interface Erc8004Registration {
  type: string;
  name: string;
  description: string;
  image: string;
  active: boolean;
  supportedTrust: string[];
  services: Array<{ name: string; endpoint: string; version?: string }>;
  registrations: Array<{ agentId: string; agentRegistry: string }>;
  /** GL1TCH extension shaped after the ERC-8004 Reputation Registry feedback record. */
  reputation: {
    value: number;
    valueDecimals: number;
    tag1: TrustLevel;
    endpoint: string;
    feedbackURI: string;
    clientAddress: string;
  };
}

/** Build an ERC-8004-compatible Agent Registration File from a GL1TCH assessment. */
export function erc8004Registration(a: AgentAssessment, origin: string): Erc8004Registration {
  const short = `${a.address.slice(0, 6)}…${a.address.slice(-4)}`;
  const o = origin.replace(/\/$/, "");
  return {
    type: "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
    name: `${short} — GL1TCH trust assessment`,
    description:
      `GL1TCH Know Your Agent assessment for agent wallet ${a.address} on ${a.chain}. ` +
      `Trust level "${a.level}" (score ${a.score}/100) from identity, provenance, and Signal Graph ` +
      `track record. GL1TCH is an off-chain, ERC-8004-compatible reputation signal — never key custody. ` +
      `On-chain Identity Registry registration is the operator's responsibility.`,
    image: `${o}/api/agent/badge?address=${encodeURIComponent(a.address)}&chain=${encodeURIComponent(a.chain)}`,
    active: true,
    supportedTrust: ["reputation"],
    services: [
      { name: "gl1tch-kya", endpoint: `${o}/api/agent/check?address=${encodeURIComponent(a.address)}&chain=${encodeURIComponent(a.chain)}`, version: "1" },
    ],
    registrations: [
      { agentId: a.address, agentRegistry: `gl1tch:${a.chain}:${o}/agents` },
    ],
    reputation: {
      value: a.score,
      valueDecimals: 0,
      tag1: a.level,
      endpoint: "gl1tch-kya",
      feedbackURI: `${o}/agents/${encodeURIComponent(a.chain === "solana" ? a.address : `${a.chain}-${a.address}`)}`,
      clientAddress: "GL1TCH",
    },
  };
}

/** Trust assessment for an agent wallet. Null on any failure. */
export async function agentCheck(address: string, chain = "solana"): Promise<AgentAssessment | null> {
  try {
    const qs = new URLSearchParams({ address, chain });
    const r = await fetch(`${BASE}/signal/agent?${qs.toString()}`, {
      signal: AbortSignal.timeout(6000),
      next: { revalidate: 30 },
    });
    if (!r.ok) return null;
    const d = (await r.json()) as { ok?: boolean; agent?: AgentAssessment };
    return d.ok && d.agent ? d.agent : null;
  } catch {
    return null;
  }
}
