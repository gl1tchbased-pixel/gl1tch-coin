/**
 * @gl1tch/agent-toolkit
 * Drop-in tool definitions & client for:
 *  - SendAI Solana Agent Kit
 *  - ElizaOS (@elizaos/core Plugin)
 *  - LangChain / Vercel AI SDK / OpenAI Function Calling
 *  - Coinbase x402 (@x402/fetch) & $GL1TCH Holder API Keys (gk_... / gl1tch_zkap_...)
 */

export const DEFAULT_BASE_URL = "https://gl1tchbased.xyz";

export class Gl1tchClient {
  /**
   * @param {object} [opts]
   * @param {string} [opts.baseUrl]
   * @param {string} [opts.apiKey] - Optional $GL1TCH holder API key (`gk_...` or `gl1tch_zkap_...`) for free access to x402 endpoints
   * @param {boolean} [opts.useX402] - When true (or when apiKey/x402 fetch is supplied), routes requests through `/api/x402/*`
   * @param {typeof fetch} [opts.fetch] - Custom fetch (e.g. `wrapFetchWithPayment(fetch, client)` from `@x402/fetch`)
   */
  constructor(opts = {}) {
    this.baseUrl = (opts.baseUrl || DEFAULT_BASE_URL).replace(/\/$/, "");
    this.apiKey = opts.apiKey || process.env.GL1TCH_API_KEY || "";
    this.useX402 = Boolean(opts.useX402 || this.apiKey);
    this.fetchImpl = opts.fetch || globalThis.fetch;
  }

  async _get(freePath, paidPath, params = {}) {
    const targetPath = this.useX402 ? paidPath : freePath;
    const url = new URL(`${this.baseUrl}${targetPath}`);
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== "") {
        url.searchParams.set(k, String(v));
      }
    }
    const headers = { accept: "application/json" };
    if (this.apiKey) headers["x-gl1tch-key"] = this.apiKey;
    const res = await this.fetchImpl(url.toString(), { headers });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`GL1TCH API ${res.status} on ${targetPath}: ${body.slice(0, 240)}`);
    }
    return res.json();
  }

  /** Full token safety scan (mint/freeze authority, LP lock, honeypot tax, top holders, insider graph). */
  async scanToken({ mint, chain }) {
    return this._get("/api/v1/scan", "/api/x402/scan", { mint, chain });
  }

  /** Fast compact token safety screen ($0.001 on x402). */
  async quickCheck({ mint, chain }) {
    return this._get("/api/v1/scan", "/api/x402/quick", { mint, chain });
  }

  /** Batch safety check for up to 10 token addresses in one call ($0.008 on x402). */
  async batchScan({ mints, chain }) {
    const list = Array.isArray(mints) ? mints.join(",") : String(mints);
    return this._get("/api/x402/batch", "/api/x402/batch", { mints: list, chain });
  }

  /** DeFi Yield X-Ray across 7 chains (Aave v3, Kamino, Jito, Lido, Orca, Uniswap v3, JustLend). */
  async yieldXRay({ chain, kind, stable, id } = {}) {
    return this._get("/api/yield", "/api/x402/yield", { chain, kind, stable, id });
  }

  /** Serial rugger & deployer reputation from the GL1TCH Signal Graph. */
  async deployerReputation({ address, chain = "solana" }) {
    return this._get("/api/v1/deployer", "/api/x402/deployer", { address, chain });
  }

  /** Know Your Agent (KYA) wallet trust score. */
  async agentTrust({ address, chain = "solana" }) {
    return this._get("/api/v1/agent/trust", "/api/x402/agent", { address, chain });
  }

  /** Rug Radar: freshly launched Solana tokens ranked riskiest first. */
  async rugRadar({ since } = {}) {
    return this._get("/api/radar", "/api/x402/radar", { since });
  }

  /** Verifiable random integers seeded by League of Entropy drand quicknet. */
  async verifiableRandom({ min = 1, max = 100, count = 1, salt } = {}) {
    return this._get("/api/x402/random", "/api/x402/random", { min, max, count, salt });
  }
}

/**
 * Create tool definitions compatible with SendAI Solana Agent Kit / LangChain / Vercel AI SDK.
 */
export function createSolanaAgentKitTools(opts = {}) {
  const client = opts instanceof Gl1tchClient ? opts : new Gl1tchClient(opts);
  return [
    {
      name: "gl1tch_scan_token",
      description:
        "Scan a Solana or EVM token for rug-pull and honeypot risks before buying or swapping. Returns verdict (CLEAN to RUG-SHAPED), 0-100 score, mint/freeze authority, LP lock %, buy/sell tax, holder concentration, and insider clusters.",
      parameters: {
        type: "object",
        properties: {
          mint: { type: "string", description: "Solana token mint or EVM contract address" },
          chain: { type: "string", description: "Optional chain (solana, base, ethereum, bsc, arbitrum, polygon)" },
        },
        required: ["mint"],
      },
      execute: (args) => client.scanToken(args),
    },
    {
      name: "gl1tch_yield_xray",
      description:
        "Read live on-chain DeFi yields across 7 chains (Solana, Ethereum, Base, Arbitrum, BSC, Tron, Robinhood) with APY source, withdrawable idle liquidity, IL risk, and explainable 0-100 risk score.",
      parameters: {
        type: "object",
        properties: {
          chain: { type: "string", description: "Filter by chain (e.g. solana, ethereum, base)" },
          kind: { type: "string", description: "Filter by kind: lending, liquid-staking, vault, dex-lp" },
          stable: { type: "boolean", description: "True for stablecoin pools only" },
          id: { type: "string", description: "Specific pool id (e.g. solana-kamino-usdc)" },
        },
      },
      execute: (args) => client.yieldXRay(args),
    },
    {
      name: "gl1tch_deployer_reputation",
      description:
        "Check a token creator/deployer wallet for serial rug-pull history across prior launches in the GL1TCH Signal Graph.",
      parameters: {
        type: "object",
        properties: {
          address: { type: "string", description: "Deployer wallet address" },
          chain: { type: "string", description: "Chain (default solana)" },
        },
        required: ["address"],
      },
      execute: (args) => client.deployerReputation(args),
    },
    {
      name: "gl1tch_rug_radar",
      description:
        "Fetch freshly launched Solana tokens (Pump.fun & DexScreener) pre-screened for rug vectors and sorted riskiest first.",
      parameters: {
        type: "object",
        properties: {
          since: { type: "number", description: "Optional Unix ms cursor from previous radar call" },
        },
      },
      execute: (args) => client.rugRadar(args),
    },
    {
      name: "gl1tch_agent_trust",
      description:
        "Know Your Agent (KYA) wallet reputation check before an AI agent pays or transacts with another wallet.",
      parameters: {
        type: "object",
        properties: {
          address: { type: "string", description: "Agent wallet address" },
          chain: { type: "string", description: "Chain (default solana)" },
        },
        required: ["address"],
      },
      execute: (args) => client.agentTrust(args),
    },
  ];
}

/**
 * Create an ElizaOS-compatible Plugin (`@elizaos/core`).
 */
export function gl1tchElizaPlugin(opts = {}) {
  const tools = createSolanaAgentKitTools(opts);
  return {
    name: "@gl1tch/plugin-solana-safety",
    description:
      "GL1TCH Token Safety Scanner, Serial Deployer Graph, Rug Radar & On-Chain DeFi Yield X-Ray for Solana and EVM agents.",
    actions: tools.map((t) => ({
      name: t.name.toUpperCase(),
      similes: [t.name],
      description: t.description,
      validate: async () => true,
      handler: async (_runtime, _message, _state, options, callback) => {
        const result = await t.execute(options || {});
        if (callback) await callback({ text: JSON.stringify(result, null, 2), content: result });
        return result;
      },
      examples: [],
    })),
  };
}

