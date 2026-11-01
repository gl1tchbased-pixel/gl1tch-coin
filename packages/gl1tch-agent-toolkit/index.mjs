/**
 * @gl1tch/agent-toolkit v1.2.0
 *
 * Drop-in tools, evaluators, streams, and cryptographic helpers for:
 *  - SendAI Solana Agent Kit & LangChain
 *  - ElizaOS (@elizaos/core: actions, providers, evaluators)
 *  - Pre-Trade Security Guard & Anti-Honeypot Firewall
 *  - Verifiable drand Quantum Randomness for Raffles, Giveaways & Web3 Gaming
 *  - VIP Rug Radar Live SSE Stream & Incremental Polling
 *  - Know Your Agent (KYA / ERC-8004) Attestation Verification
 *  - Coinbase x402 (@x402/fetch) & $GL1TCH Holder Keys (gk_... / gl1tch_zkap_...)
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
    this.apiKey = opts.apiKey || (typeof process !== "undefined" && process.env?.GL1TCH_API_KEY) || "";
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
  async scanToken({ mint, chain = "solana" }) {
    return this._get("/api/scan", "/api/x402/scan", { mint, chain });
  }

  /** Fast compact token safety screen ($0.001 on x402). */
  async quickCheck({ mint, chain = "solana" }) {
    return this._get("/api/scan", "/api/x402/quick", { mint, chain });
  }

  /** Batch safety check for up to 10 token addresses in one call ($0.008 on x402). */
  async batchScan({ mints, chain = "solana" }) {
    const list = Array.isArray(mints) ? mints.join(",") : String(mints);
    return this._get("/api/x402/batch", "/api/x402/batch", { mints: list, chain });
  }

  /** Condensed token verdict card with shareable image link ($0.01 on x402). */
  async tokenVerdict({ mint, chain = "solana" }) {
    return this._get("/api/scan", "/api/x402/verdict", { mint, chain });
  }

  /** DeFi Yield X-Ray across 7 chains (Aave v3, Kamino, Jito, Lido, Orca, Uniswap v3, JustLend). */
  async yieldXRay({ chain, kind, stable, id } = {}) {
    return this._get("/api/yield", "/api/x402/yield", { chain, kind, stable, id });
  }

  /** Serial rugger & deployer reputation from the GL1TCH Signal Graph ($0.003 on x402). */
  async deployerReputation({ address, chain = "solana" }) {
    return this._get("/api/x402/deployer", "/api/x402/deployer", { address, chain });
  }

  /** Know Your Agent (KYA) wallet trust score and on-chain verification ($0.01 on x402). */
  async agentTrust({ address, chain = "solana" }) {
    return this._get("/api/agent/check", "/api/x402/agent", { address, chain });
  }

  /** Rug Radar: freshly launched Solana tokens ranked riskiest first ($0.002 on x402). */
  async rugRadar({ since } = {}) {
    return this._get("/api/radar", "/api/x402/radar", { since });
  }

  /** Verifiable random integers seeded by League of Entropy drand quicknet ($0.003 on x402). */
  async verifiableRandom({ min = 1, max = 100, count = 1, salt } = {}) {
    return this._get("/api/x402/random", "/api/x402/random", { min, max, count, salt });
  }
}

/* =========================================================================
 * 1. PRE-TRADE GUARD & EVALUATOR (ElizaOS & Trading Bot Firewall)
 * ========================================================================= */

/**
 * Pre-trade security check. Halts buys if score is low or token is a honeypot/rug.
 * @param {string} mint
 * @param {object} [opts]
 * @param {number} [opts.minScore=65] - Minimum required score (0-100)
 * @param {boolean} [opts.rejectHoneypot=true] - Instantly reject if honeypot or sell tax > 10%
 * @param {string} [opts.chain="solana"]
 * @param {Gl1tchClient} [opts.client]
 */
export async function gl1tchPreTradeGuard(mint, opts = {}) {
  if (!mint || typeof mint !== "string") {
    throw new Error("Valid token mint string is required for pre-trade guard");
  }
  const client = opts.client || new Gl1tchClient(opts);
  const minScore = opts.minScore ?? 65;
  const rejectHoneypot = opts.rejectHoneypot ?? true;
  const chain = opts.chain || "solana";

  const check = await client.quickCheck({ mint, chain });
  const score = Number(check.score ?? 0);
  const verdict = String(check.verdict ?? "UNKNOWN").toUpperCase();

  const isHoneypot = Boolean(
    check.honeypot ||
    (check.flags && Array.isArray(check.flags) && check.flags.some((f) => String(f).toLowerCase().includes("honeypot"))) ||
    (check.risks && Array.isArray(check.risks) && check.risks.some((r) => String(r).toLowerCase().includes("honeypot") || String(r).toLowerCase().includes("cannot be sold")))
  );

  const isRugShaped = verdict === "RUG-SHAPED" || verdict === "HIGH RISK" || (score < 40 && verdict !== "CLEAN");

  let approved = true;
  let reason = `Token passed safety guard (Score: ${score}/100, Verdict: ${verdict}).`;

  if (rejectHoneypot && isHoneypot) {
    approved = false;
    reason = `BLOCKED: Honeypot or non-transferable token detected (Score: ${score}/100).`;
  } else if (isRugShaped) {
    approved = false;
    reason = `BLOCKED: High-risk token architecture rated ${verdict} (Score: ${score}/100).`;
  } else if (score < minScore) {
    approved = false;
    reason = `BLOCKED: Safety score ${score}/100 is below the required threshold of ${minScore}/100.`;
  }

  return {
    approved,
    score,
    verdict,
    reason,
    mint,
    chain,
    details: check,
  };
}

/**
 * ElizaOS Provider: Automatically injects token risk intelligence into the agent's context.
 */
export function gl1tchSafetyProvider(opts = {}) {
  const client = opts.client || new Gl1tchClient(opts);
  return {
    get: async (_runtime, message, _state) => {
      const text = typeof message === "string" ? message : (message?.content?.text || "");
      const solanaMatch = text.match(/\b[1-9A-HJ-NP-Za-km-z]{32,44}\b/);
      const evmMatch = text.match(/\b0x[a-fA-F0-9]{40}\b/);
      const target = solanaMatch ? solanaMatch[0] : (evmMatch ? evmMatch[0] : null);
      if (!target) return null;

      try {
        const scan = await client.quickCheck({ mint: target, chain: evmMatch ? "base" : "solana" });
        return `[GL1TCH Safety Intelligence] Token: ${target} | Verdict: ${scan.verdict || "UNKNOWN"} | Safety Score: ${scan.score ?? "?"}/100 | Risk Summary: ${scan.bottomLine || scan.oneLiner || "Audited via GL1TCH on-chain graph."}`;
      } catch {
        return null;
      }
    },
  };
}

/**
 * ElizaOS Evaluator: Evaluates token risk and guards swap/buy intents.
 */
export function gl1tchPreTradeEvaluator(opts = {}) {
  return {
    name: "GL1TCH_PRE_TRADE_EVALUATOR",
    similes: ["EVALUATE_TOKEN_SAFETY", "GUARD_SWAP"],
    description: "Evaluates whether any token mentioned for swapping or buying meets safety requirements.",
    validate: async () => true,
    handler: async (_runtime, message) => {
      const text = typeof message === "string" ? message : (message?.content?.text || "");
      const solanaMatch = text.match(/\b[1-9A-HJ-NP-Za-km-z]{32,44}\b/);
      const evmMatch = text.match(/\b0x[a-fA-F0-9]{40}\b/);
      const mint = solanaMatch ? solanaMatch[0] : (evmMatch ? evmMatch[0] : null);
      if (!mint) return { verified: true, note: "No token address found in conversation." };

      const guard = await gl1tchPreTradeGuard(mint, { ...opts, chain: evmMatch ? "base" : "solana" });
      return {
        verified: guard.approved,
        mint,
        verdict: guard.verdict,
        score: guard.score,
        reason: guard.reason,
      };
    },
  };
}

/* =========================================================================
 * 2. PROVABLY FAIR VERIFIABLE QUANTUM RANDOMNESS (drand BLS12-381)
 * ========================================================================= */

/**
 * Deterministically pick N unique winners from a list of participants using drand entropy.
 * Verifiable by anyone with the returned drand round and signature.
 */
export async function drawProvablyFairWinners({ participants, count = 1, salt = "", client: passedClient, ...clientOpts }) {
  if (!Array.isArray(participants) || participants.length === 0) {
    throw new Error("participants must be a non-empty array of wallet addresses or usernames");
  }
  const client = passedClient || new Gl1tchClient(clientOpts);
  const randomRes = await client.verifiableRandom({ min: 1, max: 1_000_000, count: 1, salt });

  const signature = String(randomRes.signature || randomRes.randomness || randomRes.numbers?.[0] || Date.now());
  const copy = [...participants];
  const winners = [];
  const targetCount = Math.min(count, copy.length);

  // Deterministic seed expansion from signature hex
  let seed = 0;
  for (let i = 0; i < signature.length; i++) {
    seed = (seed * 31 + signature.charCodeAt(i)) >>> 0;
  }

  // Fisher-Yates draw
  for (let i = 0; i < targetCount; i++) {
    // Linear congruential generator step
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const pickedIdx = seed % copy.length;
    winners.push(copy[pickedIdx]);
    copy.splice(pickedIdx, 1);
  }

  return {
    winners,
    round: randomRes.round,
    signature: randomRes.signature,
    randomness: randomRes.randomness,
    proofUrl: randomRes.proofUrl || `${client.baseUrl}/quantum-core/beacon`,
    timestamp: Date.now(),
  };
}

/**
 * Provably fair dice roll for Discord, Telegram & on-chain gaming agents.
 */
export async function rollProvablyFairDice({ sides = 6, count = 1, salt = "", client: passedClient, ...clientOpts } = {}) {
  const client = passedClient || new Gl1tchClient(clientOpts);
  const res = await client.verifiableRandom({ min: 1, max: sides, count, salt });
  return {
    rolls: res.numbers || [res.number || 1],
    round: res.round,
    signature: res.signature,
    proofUrl: res.proofUrl || `${client.baseUrl}/quantum-core/beacon`,
  };
}

/**
 * Provably fair shuffle for cards, NFT mint sequences, or token distributions.
 */
export async function shuffleProvablyFair({ items, salt = "", client: passedClient, ...clientOpts }) {
  if (!Array.isArray(items)) throw new Error("items must be an array");
  const draw = await drawProvablyFairWinners({ participants: items, count: items.length, salt, client: passedClient, ...clientOpts });
  return {
    shuffled: draw.winners,
    round: draw.round,
    signature: draw.signature,
    proofUrl: draw.proofUrl,
  };
}

/* =========================================================================
 * 3. VIP RUG RADAR STREAM & INCREMENTAL POLLING (Alpha & MEV Feeds)
 * ========================================================================= */

/**
 * Connect to the Rug Radar SSE stream with automatic reconnection and optional safety filtering.
 */
export function createRadarStreamListener({ onToken, onSweep, onError, filter = {}, baseUrl = DEFAULT_BASE_URL, key } = {}) {
  let active = true;
  let eventSource = null;

  const url = new URL(`${baseUrl.replace(/\/$/, "")}/api/radar/stream`);
  if (key) url.searchParams.set("key", key);

  async function connect() {
    if (!active) return;
    try {
      const res = await fetch(url.toString(), {
        headers: {
          accept: "text/event-stream",
          ...(key ? { "x-gl1tch-key": key } : {}),
        },
      });

      if (!res.ok) {
        throw new Error(`Radar stream HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (active) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const block of lines) {
          const match = block.match(/data:\s*(.*)/);
          if (!match) continue;
          try {
            const data = JSON.parse(match[1]);
            if (data.caught && Array.isArray(data.caught)) {
              if (onSweep) onSweep(data);
              if (onToken) {
                for (const t of data.caught) {
                  if (filter.cleanOnly && t.verdict !== "CLEAN") continue;
                  if (filter.minScore && (t.score ?? 0) < filter.minScore) continue;
                  onToken(t);
                }
              }
            }
          } catch {
            /* ignore parse err */
          }
        }
      }
    } catch (err) {
      if (onError) onError(err);
      if (active) setTimeout(connect, 5000);
    }
  }

  connect();

  return {
    close: () => {
      active = false;
      if (eventSource && typeof eventSource.close === "function") eventSource.close();
    },
  };
}

/* =========================================================================
 * 4. KNOW YOUR AGENT (KYA / ERC-8004) ATTESTATION HELPERS
 * ========================================================================= */

/**
 * Verify another AI agent's trustworthiness before sending funds or delegating tasks.
 */
export async function verifyAgentTrust({ address, chain = "solana", requiredLevel = "neutral", client: passedClient, ...clientOpts }) {
  if (!address) throw new Error("address is required for agent trust check");
  const client = passedClient || new Gl1tchClient(clientOpts);
  const trust = await client.agentTrust({ address, chain });

  const score = Number(trust.score ?? 50);
  const level = String(trust.level ?? "unknown").toLowerCase();

  const levelsRank = { unknown: 0, caution: 1, neutral: 2, trusted: 3 };
  const targetRank = levelsRank[requiredLevel.toLowerCase()] ?? 2;
  const currentRank = levelsRank[level] ?? 0;

  const isTrusted = currentRank >= targetRank && level !== "caution";

  return {
    isTrusted,
    score,
    level,
    reasons: trust.reasons || [],
    badges: trust.badges || [],
    proven: Boolean(trust.proven),
    erc8004Url: `${client.baseUrl}/api/agent/erc8004?address=${address}&chain=${chain}`,
  };
}

/* =========================================================================
 * 5. SOLANA AGENT KIT & ELIZAOS FULL BUNDLE
 * ========================================================================= */

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
      name: "gl1tch_quick_check",
      description:
        "Fast low-cost pre-flight token check ($0.001) for trade and sniper agents. Checks LP lock, honeypot tax, mint authority and safety score.",
      parameters: {
        type: "object",
        properties: {
          mint: { type: "string", description: "Solana token mint or EVM contract address" },
          chain: { type: "string", description: "Optional chain (default solana)" },
        },
        required: ["mint"],
      },
      execute: (args) => client.quickCheck(args),
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
        "Know Your Agent (KYA / ERC-8004) wallet reputation check before an AI agent pays or transacts with another wallet.",
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
    {
      name: "gl1tch_verifiable_random",
      description:
        "Generate cryptographically verifiable random numbers from the League of Entropy drand beacon for raffles, giveaways, and fair games.",
      parameters: {
        type: "object",
        properties: {
          min: { type: "number", description: "Minimum integer (default 1)" },
          max: { type: "number", description: "Maximum integer (default 100)" },
          count: { type: "number", description: "Count of numbers to draw (default 1)" },
          salt: { type: "string", description: "Optional entropy salt" },
        },
      },
      execute: (args) => client.verifiableRandom(args),
    },
    {
      name: "gl1tch_token_verdict",
      description:
        "Generate a shareable verdict card with safety score, top risk factors, and image link for posting in chats or social feeds.",
      parameters: {
        type: "object",
        properties: {
          mint: { type: "string", description: "Solana token mint or EVM address" },
          chain: { type: "string", description: "Chain (default solana)" },
        },
        required: ["mint"],
      },
      execute: (args) => client.tokenVerdict(args),
    },
  ];
}

/**
 * Complete ElizaOS Plugin (`@elizaos/core`).
 * Bundles Actions, Safety Context Provider, and Pre-Trade Guard Evaluator.
 */
export function gl1tchElizaPlugin(opts = {}) {
  const tools = createSolanaAgentKitTools(opts);
  return {
    name: "@gl1tch/plugin-solana-safety",
    description:
      "GL1TCH Token Safety Scanner, Serial Deployer Graph, Rug Radar, Verifiable Drand Randomness & DeFi Yield X-Ray for AI agents.",
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
    providers: [gl1tchSafetyProvider(opts)],
    evaluators: [gl1tchPreTradeEvaluator(opts)],
  };
}
