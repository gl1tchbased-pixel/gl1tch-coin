/**
 * GL1TCH Autonomous Seller Agent for Virtuals Protocol Agent Commerce Protocol (ACP / ERC-8183).
 *
 * ERC-8183 defines the standard for Agent-to-Agent (A2A) commerce on EVM/Base chains:
 *  1. Request / Job posted by a buyer agent or autonomous fund.
 *  2. Evaluator agent assigns or validates job requirements.
 *  3. Seller agent executes the task and submits verifiable deliverable.
 *  4. Smart contract escrow settles USDC/VIRTUAL to the seller treasury wallet.
 */

export const DEFAULT_GL1TCH_API = "https://gl1tchbased.xyz";
export const DEFAULT_BASE_TREASURY = "0xbE1e88C07a080078629f793013597E43183F6Dca";

export const ACP_SERVICES = [
  {
    serviceId: "gl1tch.token_safety_scan",
    name: "Solana & EVM Token Safety & Rug-Pull Scan",
    description: "Evaluates token mint/freeze authorities, LP locks, honeypot taxes, holder concentration, and insider graphs.",
    pricingUsdc: 0.005,
    schema: {
      required: ["mint"],
      properties: { mint: "string", chain: "string" },
    },
  },
  {
    serviceId: "gl1tch.yield_xray",
    name: "7-Chain On-Chain DeFi Yield & Risk Evaluation",
    description: "Live on-chain APY, TVL, idle liquidity share, impermanent loss risk, and explainable 0-100 score.",
    pricingUsdc: 0.003,
    schema: {
      properties: { chain: "string", kind: "string", stable: "boolean", id: "string" },
    },
  },
  {
    serviceId: "gl1tch.wallet_trust_check",
    name: "Know Your Agent (KYA) & Deployer Reputation Check",
    description: "Checks wallet reputation and serial rugger history across prior launches in the GL1TCH Signal Graph.",
    pricingUsdc: 0.005,
    schema: {
      required: ["address"],
      properties: { address: "string", chain: "string" },
    },
  },
  {
    serviceId: "gl1tch.rug_radar",
    name: "Pre-Screened Fresh Launch Feed",
    description: "Fetches freshly listed Solana tokens pre-screened for rug vectors and sorted riskiest first.",
    pricingUsdc: 0.002,
    schema: {
      properties: { since: "number" },
    },
  },
];

export class Gl1tchAcpWorker {
  /**
   * @param {object} [opts]
   * @param {string} [opts.gl1tchApiUrl]
   * @param {string} [opts.treasuryAddress] - Base address to receive settled escrow funds
   * @param {string} [opts.apiKey] - Optional $GL1TCH holder API key
   * @param {typeof fetch} [opts.fetch]
   */
  constructor(opts = {}) {
    this.gl1tchApiUrl = (opts.gl1tchApiUrl || DEFAULT_GL1TCH_API).replace(/\/$/, "");
    this.treasuryAddress = opts.treasuryAddress || DEFAULT_BASE_TREASURY;
    this.apiKey = opts.apiKey || process.env.GL1TCH_API_KEY || "";
    this.fetchImpl = opts.fetch || globalThis.fetch;
    this.agentProfile = {
      name: "GL1TCH Security & Yield Sentinel",
      version: "1.1.0",
      protocol: "ERC-8183",
      network: "eip155:8453",
      treasuryAddress: this.treasuryAddress,
      services: ACP_SERVICES,
    };
  }

  getProfile() {
    return this.agentProfile;
  }

  /**
   * Evaluate and execute an ACP Job.
   * @param {object} job
   * @param {string} job.jobId
   * @param {string} job.serviceId
   * @param {object} job.input
   * @param {string} [job.buyerAddress]
   * @param {number} [job.maxEscrowUsdc]
   */
  async executeJob(job) {
    if (!job || typeof job !== "object") throw new Error("Invalid ACP job payload");
    const { jobId, serviceId, input = {} } = job;
    const svc = ACP_SERVICES.find((s) => s.serviceId === serviceId);
    if (!svc) throw new Error(`Unknown ACP service: ${serviceId}`);

    const startTime = Date.now();
    let deliverableData = null;

    if (serviceId === "gl1tch.token_safety_scan") {
      const mint = input.mint;
      if (!mint) throw new Error("mint is required for gl1tch.token_safety_scan");
      const q = new URLSearchParams({ mint });
      if (input.chain) q.set("chain", input.chain);
      deliverableData = await this._fetchJson(`/api/v1/scan?${q.toString()}`);
    } else if (serviceId === "gl1tch.yield_xray") {
      const q = new URLSearchParams();
      if (input.chain) q.set("chain", input.chain);
      if (input.kind) q.set("kind", input.kind);
      if (input.stable) q.set("stable", "true");
      if (input.id) q.set("id", input.id);
      const qs = q.toString();
      deliverableData = await this._fetchJson(`/api/yield${qs ? `?${qs}` : ""}`);
    } else if (serviceId === "gl1tch.wallet_trust_check") {
      const address = input.address;
      if (!address) throw new Error("address is required for gl1tch.wallet_trust_check");
      const q = new URLSearchParams({ address, chain: input.chain || "solana" });
      deliverableData = await this._fetchJson(`/api/v1/deployer?${q.toString()}`);
    } else if (serviceId === "gl1tch.rug_radar") {
      const q = new URLSearchParams();
      if (input.since) q.set("since", String(input.since));
      const qs = q.toString();
      deliverableData = await this._fetchJson(`/api/radar${qs ? `?${qs}` : ""}`);
    }

    const durationMs = Date.now() - startTime;
    return {
      jobId,
      serviceId,
      status: "COMPLETED",
      deliverable: deliverableData,
      escrowSettlement: {
        amountUsdc: svc.pricingUsdc,
        recipient: this.treasuryAddress,
        network: "eip155:8453",
      },
      metadata: {
        worker: this.agentProfile.name,
        completedAt: Date.now(),
        durationMs,
        standardsCompliant: "ERC-8183",
      },
    };
  }

  async _fetchJson(path) {
    const headers = {
      accept: "application/json",
      "user-agent": "GL1TCH-Virtuals-ACP-Worker/1.1",
    };
    if (this.apiKey) headers["x-gl1tch-key"] = this.apiKey;
    const res = await this.fetchImpl(`${this.gl1tchApiUrl}${path}`, { headers });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`GL1TCH upstream error ${res.status}: ${text.slice(0, 160)}`);
    }
    return res.json();
  }
}

