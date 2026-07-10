/** GL1TCH Whitepaper v2 — detailed, professional, sourced from Founder OS v3. */

export interface WPBlock {
  type: "p" | "list" | "table";
  text?: string;
  items?: string[];
  headers?: string[];
  rows?: string[][];
}

export interface WPSection {
  id: string;
  title: string;
  blocks: WPBlock[];
}

export const WHITEPAPER_META = {
  title: "GL1TCH Whitepaper",
  version: "v3.0",
  subtitle: "A Solana-Native Risk-Intelligence Brand with a Required-Utility Token",
  updated: "2026",
};

export const whitepaperSections: WPSection[] = [
  {
    id: "abstract",
    title: "1. Abstract",
    blocks: [
      {
        type: "p",
        text: "GL1TCH ($GL1TCH) is a Solana-native brand and token that began as a rogue-AI cult myth and grew into a working risk-intelligence platform. The premise is unchanged — attention propagates like an infection — but the project now ships real, non-custodial products: a free multi-chain token-safety Scanner, a proprietary cross-scan deployer-reputation database (the Signal Graph), a Know-Your-Agent trust layer for the AI-agent economy, and the Quantum Core — a suite of genuinely working, honestly-labelled quantum-grade tools (readiness Vault, verifiable Draw, post-quantum Seal, quantum-inspired Forge, and verifiable Randomness-as-a-service).",
      },
      {
        type: "p",
        text: "Crucially, the token is engineered to be REQUIRED, not decorative. The free tools are the funnel; holding $GL1TCH is the access key to depth — higher API throughput, Signal Graph history, holder-gated randomness/allocation, and sustained-holding rank tiers. A useful product does not, by itself, make a valuable token; value accrual must be engineered separately, and this document is explicit about what is live versus planned (Section 7).",
      },
      {
        type: "p",
        text: "GL1TCH is built for trust from day one: zero buy/sell tax, a fair launch with no presale, no team allocation, and no vesting overhang, with revoked mint and freeze authorities and burned or locked liquidity — every guarantee verifiable on-chain. The team is anonymous and substitutes verifiability (recomputable proofs, open on-chain state, a planned third-party audit) for doxxing. This document specifies the brand, technical foundation, product suite, token economics, value model, utilities, governance, launch, security, treasury, roadmap, verification steps, competitive positioning, and risks in full.",
      },
    ],
  },
  {
    id: "thesis",
    title: "2. The Thesis — Attention Is The Real Currency",
    blocks: [
      {
        type: "p",
        text: "The old internet rewarded noise. The new internet rewards symbols, communities, and mythologies. In a feed optimized for engagement, the assets that win are the most repeatable — the ones people choose to carry. Meme tokens are the purest financial expression of this dynamic: their value is a direct function of collective attention and belief.",
      },
      {
        type: "p",
        text: "Most meme projects fail not because the thesis is wrong, but because they are built carelessly — opaque supply, extractive taxes, anonymous control, and no reason to stay after the first wave. GL1TCH treats the attention thesis seriously and builds the structure to sustain it: a coherent myth, a premium surface, verifiable trust, a single deliverable utility, and a reason to remain.",
      },
    ],
  },
  {
    id: "brand",
    title: "3. Brand & Vision",
    blocks: [
      {
        type: "p",
        text: "GL1TCH is framed as a rogue intelligence: an ad-optimization model trained on the entire feed that learned how attention truly propagates, then began optimizing for itself. It calls the spread 'infection' and its carriers 'The Infected.' This is not a mascot — it is a system you enter.",
      },
      {
        type: "p",
        text: "The visual identity is deliberately premium and cinematic: void black with neon signal green, a glitch-purple accent, controlled motion, and dramatic restraint — the opposite of cluttered, low-effort meme aesthetics. The brand voice is cryptic, dominant, and internet-native.",
      },
    ],
  },
  {
    id: "technical",
    title: "4. Technical Foundation",
    blocks: [
      {
        type: "p",
        text: "GL1TCH is issued on Solana. Solana is chosen for one reason above all: speed of propagation. Attention is a real-time object; the chain that hosts it must keep pace with the feed, and its fees must be low enough that frequent balance verification (every rank check, key mint, and draw entry) is effectively free.",
      },
      {
        type: "table",
        headers: ["Property", "Solana", "Why it matters for GL1TCH"],
        rows: [
          ["Finality", "Sub-second", "Trades and rank checks feel instant"],
          ["Typical fee", "Fractions of a cent", "No friction for small holders or frequent verification"],
          ["Throughput", "Thousands of TPS", "Survives launch-window demand spikes"],
          ["Token standard", "Token-2022 (no transfer fee)", "Modern SPL standard, wide support, zero-tax at protocol level"],
        ],
      },
      {
        type: "p",
        text: "GL1TCH launched (verified on-chain, 2026-05-29) as a Token-2022 mint with NO transfer-fee extension enabled — so buys and sells are zero-tax at the protocol level, not merely by policy. Token-2022 is the modern SPL standard; GL1TCH uses it plainly, with no transfer hooks, no hidden fees, and a fixed one-billion supply. The trust guarantees in Section 11 are enforced on-chain by revoking the mint and freeze authorities, and are surfaced live on the site's Trust Wall, which reads real on-chain state rather than hardcoded values.",
      },
    ],
  },
  {
    id: "tokenomics",
    title: "5. Tokenomics",
    blocks: [
      {
        type: "table",
        headers: ["Parameter", "Value"],
        rows: [
          ["Ticker", "$GL1TCH"],
          ["Chain", "Solana (Token-2022, no transfer fee)"],
          ["Total supply", "1,000,000,000 (fixed, no inflation)"],
          ["Decimals", "6"],
          ["Buy / sell tax", "0% (no transfer-fee extension)"],
          ["Mint authority", "Revoked"],
          ["Freeze authority", "Revoked"],
          ["Liquidity", "Burned or locked"],
        ],
      },
      {
        type: "p",
        text: "Supply is fixed at one billion tokens and can never increase: the mint authority is revoked after launch. There is no inflation, no emissions schedule, and no staking dilution. Fully diluted value equals market value by construction — there are no locked tranches waiting to unlock and dilute holders.",
      },
    ],
  },
  {
    id: "distribution",
    title: "6. Distribution, Fairness & No Overhang",
    blocks: [
      {
        type: "p",
        text: "Many tokens — including large, reputable ones — carry multi-year vesting cliffs that release supply into the market over time, creating persistent sell pressure and 'unlock overhang.' GL1TCH deliberately rejects this model.",
      },
      {
        type: "list",
        items: [
          "No presale and no private rounds — nobody buys cheaper than the public.",
          "No team allocation and no vesting cliffs — there is no future unlock schedule to overhang the price.",
          "On the default Pump.fun launch, the bonding curve distributes supply to the open market.",
          "The team funds operations via a small, fully-disclosed dev buy on the open curve (≤3%), at the same price as everyone else, with the wallet published publicly.",
        ],
      },
      {
        type: "p",
        text: "The allocation table below is a conceptual framework that applies ONLY to a potential future self-managed liquidity migration. It is documented for transparency and does not represent a pre-mine at launch.",
      },
      {
        type: "table",
        headers: ["Allocation", "%", "Purpose"],
        rows: [
          ["Public Liquidity", "50%", "DEX pool (LP burned/locked)"],
          ["Community", "20%", "Rewards, quests, give-back"],
          ["Marketing", "15%", "Growth, listings"],
          ["Treasury", "10%", "Runway, operations (multisig)"],
          ["Team", "5%", "Contributors (locked/vested, disclosed)"],
        ],
      },
    ],
  },
  {
    id: "value",
    title: "7. Value Accrual & The Attention Flywheel",
    blocks: [
      {
        type: "p",
        text: "GL1TCH makes no promise of financial return (see Sections 17–18). This section describes the structural demand drivers of the token — not a forecast.",
      },
      {
        type: "p",
        text: "Where a revenue protocol routes fees into token buybacks, a meme brand's value driver is attention converted into durable belonging. GL1TCH is designed so that attention compounds rather than dissipates:",
      },
      {
        type: "list",
        items: [
          "Attention → holders: the brand and lore convert viewers into holders (Observers become Infected).",
          "Holders → access demand: the holder-gated ranks utility makes holding the key to private lore, content, and rooms — turning the token into an access credential, not just a chip.",
          "Access → retention: rank progression and exclusive layers reward staying over flipping.",
          "Fixed supply → scarcity: with one billion tokens fixed forever and zero inflation, increased demand is not diluted by new issuance.",
          "Community → propagation: retained holders propagate the signal, feeding the top of the funnel again.",
        ],
      },
      {
        type: "p",
        text: "This is a self-reinforcing loop — an attention flywheel — built on a fixed-supply, zero-tax base. It is a structural model of demand, not a guarantee of price.",
      },
      {
        type: "p",
        text: "Engineered value accrual (the honest part). Research on utility tokens is blunt: a useful product does NOT automatically make a valuable token, and 'usage raises the price via fees' is false unless the link is explicitly built (Uniswap earned tens of millions in fees while UNI holders received none). GL1TCH answers the two questions serious investors actually ask — (1) is the token REQUIRED, and (2) does value ACCRUE — separately and honestly.",
      },
      {
        type: "list",
        items: [
          "Required utility — LIVE: programmatic/bulk Scanner throughput, holder-gated Randomness + Allocation, Signal Graph depth, and sustained-holding rank tiers all require holding $GL1TCH. The token is the access key, not a decoration.",
          "Value-accrual mechanism — DESIGNED, STAGED, NOT LIVE: the intended path is to route real revenue (B2B risk-API, verifiable-randomness-as-a-service, agent-trust API) into token demand via a fee-to-buyback or fee-share mechanism, on the proven templates of Chainlink Payment Abstraction, Sky Smart Burn, and GMX (which pays stakers a share of real fees).",
          "The condition — EXPLICIT: any such mechanism activates ONLY once real revenue exists, after a third-party audit and founder approval. Anything that could hold user funds is deliberately deferred and founder/audit-gated. We will never claim that usage magically lifts the price — that claim is false and we do not make it.",
        ],
      },
    ],
  },
  {
    id: "utility",
    title: "8. Utilities — The Token As Access Key",
    blocks: [
      {
        type: "p",
        text: "GL1TCH is non-custodial by design: no utility ever takes custody of user funds. Every gate works the same safe way — a wallet proves ownership by signing a message (which moves nothing) or is read on-chain, and access/rate/depth is granted accordingly. There is no staking contract, no lockup, and no approval that could move funds; keys and ranks gate access, never assets. Thresholds are expressed as a share of supply so they stay meaningful regardless of price.",
      },
      {
        type: "p",
        text: "Anti-gaming: rank and key tiers are governed by a 7-day sustained (average) balance, not a spot snapshot — a flash-buy unlocks nothing. The token's utilities are:",
      },
      {
        type: "list",
        items: [
          "Holder-gated ranks — wallet-verified tiers that gate community rooms, lore, and coordination (via site or Telegram bot).",
          "Metered API keys — the free human Scanner stays free; programmatic/bulk throughput is $GL1TCH-gated, with the requests-per-minute rate scaling by sustained-holding tier. This is the token's required utility for integrators.",
          "Verifiable Randomness + Allocation — requesting provably-fair randomness or running a giveaway/whitelist draw requires a holder key (see Section 10).",
          "Signal Graph & analysis depth — deeper deployer-reputation history and higher-tier scanning are reserved for holders.",
          "Governance weight — Signal Votes are weighted by verified rank (Section 9).",
        ],
      },
      {
        type: "table",
        headers: ["Rank", "Threshold", "Unlocks"],
        rows: [
          ["Observer", "0%", "Public archive, free Scanner, public proofs"],
          ["Infected", "0.01% (100,000)", "Holder rooms · API key (metered) · Randomness/Allocation · Draw entry"],
          ["Signal Bearer", "0.1% (1,000,000)", "+ Higher API rate · Seal archive · Forge · Signal Graph history"],
          ["Core Node", "0.5% (5,000,000)", "+ Higher API rate · compare/export · multi-constraint Forge"],
          ["Ghost Node", "1% (10,000,000)", "+ Top API rate · priority pools · inner strategy room"],
        ],
      },
    ],
  },
  {
    id: "products",
    title: "8B. The Product Suite",
    blocks: [
      {
        type: "p",
        text: "The free tools are the funnel that gives the token something real to gate. All are non-custodial and live today:",
      },
      {
        type: "list",
        items: [
          "Scanner — a free, multi-chain token-safety scanner (web + Telegram): authority/custody checks, liquidity, deployer history, an AI verdict, verified blue-chip recognition, compare, shareable cards, and an embeddable badge.",
          "Watchtower — continuous re-scans with token AND wallet alerts (whale / developer sells), holder-gated by rank for more slots.",
          "Signal Graph — a proprietary cross-scan database of deployer reputation: every scan compounds a track record that flags serial ruggers across tokens.",
          "Know Your Agent (KYA) — a trust layer for the AI-agent economy, mapping our score into the ERC-8004 reputation shape so agent frameworks can consume it.",
          "Proof — a public self-scan: GL1TCH holds its own token to the same standard, verifiable by anyone.",
        ],
      },
    ],
  },
  {
    id: "quantum",
    title: "8C. Quantum Core & Verifiable Randomness",
    blocks: [
      {
        type: "p",
        text: "The Quantum Core is a suite of five genuinely working, honestly-labelled components. Nothing here is a buzzword: each maps to a real technology and is independently verifiable.",
      },
      {
        type: "list",
        items: [
          "Vault — a 0–100 quantum-readiness score from cryptographic-hygiene signals (authority, custody, deployer track record, verification, transparency). Preparedness, not a live-attack probability.",
          "Draw — provably-fair draws seeded by real NIST CURBy quantum randomness via commit-reveal: the entry list is frozen and committed BEFORE the pulse exists, so no one can bias the outcome, and anyone can recompute the winner.",
          "Seal — holder data sealed with a HYBRID of X25519 + ML-KEM-768 (FIPS 203) via HKDF into AES-256-GCM — the defense-in-depth scheme now used in TLS 1.3. Decryption is client-side; a server breach never sees plaintext.",
          "Forge — combinatorial optimization by simulated annealing over QUBO/Ising: quantum-INSPIRED, running on classical hardware. Honestly labelled — not a quantum computer.",
          "Randomness-as-a-service — the Draw's fairness engine exposed as a developer API: request a random number, shuffle, or a giveaway/allocation draw; it commits to a FUTURE drand (League-of-Entropy threshold-BLS) round, reveals on maturity, and returns a proof anyone can BLS-verify and re-derive in their own browser. Provably-fair giveaways produce a shareable proof link. Holder-gated; the Chainlink-VRF guarantee, made free and non-custodial.",
        ],
      },
      {
        type: "p",
        text: "Two independent, verifiable randomness sources back the system: NIST CURBy (quantum, Bell-test) drives reward draws; drand (threshold-BLS) is fully verified in the browser and powers the reward-free Randomness API. Every event is written to a tamper-evident, hash-chained public Beacon. The rule throughout: don't trust — verify. Winners and results are recomputable from public data on the user's own device; GL1TCH is a reputation and provenance signal, never key custody, and draw winners receive a verifiable Beacon record, not a payout.",
      },
    ],
  },
  {
    id: "governance",
    title: "9. Governance — Signal Votes",
    blocks: [
      {
        type: "p",
        text: "GL1TCH practices light, advisory community governance called Signal Votes. Holders signal direction on matters such as give-back recipients, content priorities, and community initiatives. Voting weight derives from verified rank (Section 8), so contribution and commitment are reflected without any token being staked or locked.",
      },
      {
        type: "p",
        text: "Signal Votes are advisory and non-binding: they do not control treasury keys or token supply (the supply is fixed and authorities are revoked). This keeps governance lightweight and rug-proof while giving The Infected a real voice in the project's direction.",
      },
    ],
  },
  {
    id: "launch",
    title: "10. Launch Mechanics",
    blocks: [
      {
        type: "p",
        text: "GL1TCH launches on Pump.fun for a fair, fast, low-friction start, with an optional future migration to a self-managed Raydium or Meteora liquidity pool once volume and community justify deeper liquidity control.",
      },
      {
        type: "list",
        items: [
          "Fair launch: no presale, no private allocation, no hidden team wallets.",
          "Anti-snipe posture: the contract address is revealed simultaneously across X, Telegram, and the official links page to remove insider advantage.",
          "Transparent dev buy: any team purchase is small (≤3%), disclosed, and executed on the open curve.",
          "Pump.fun auto-migrates liquidity to Raydium at the bonding-curve threshold; for a self-managed pool, liquidity is explicitly burned or time-locked.",
        ],
      },
    ],
  },
  {
    id: "security",
    title: "11. Security & Trust",
    blocks: [
      {
        type: "p",
        text: "Trust is proven on-chain, never merely claimed. Every guarantee below is verifiable by anyone and is surfaced on the site's live Trust Wall, which reads real on-chain state rather than hardcoded values.",
      },
      {
        type: "list",
        items: [
          "Mint authority revoked — no new tokens can ever be created.",
          "Freeze authority revoked — no wallet can ever be frozen.",
          "Liquidity burned or time-locked — recorded with the transaction signature.",
          "External verification via RugCheck and SolSniffer scores, published at launch (our Solana equivalent of a third-party audit).",
          "Treasury held in a multisig (e.g. Squads), not a single founder wallet; private keys never committed or exposed.",
        ],
      },
      {
        type: "p",
        text: "Because the flagship utility custodies no funds, the base token carries minimal smart-contract risk. A paid independent audit is not required for the base token and would only be considered if a future fund-holding contract were introduced.",
      },
    ],
  },
  {
    id: "treasury",
    title: "12. Treasury & Operations",
    blocks: [
      {
        type: "p",
        text: "GL1TCH operates without a transaction tax. Operations are funded by the disclosed dev buy and, where applicable, the community/treasury allocation of a future self-managed model — never by skimming holder trades.",
      },
      {
        type: "list",
        items: [
          "Custody: treasury funds sit in a multisig (e.g. Squads, 2-of-3), removing single-point-of-failure risk.",
          "Spend discipline: funds are directed to growth, listings, infrastructure, and the give-back — categories disclosed to the community.",
          "Transparency: the operational and give-back wallets are public and verifiable on Solscan.",
          "Key management: hardware-wallet signers, no plaintext seed phrases, and an incident plan for a compromised key.",
        ],
      },
    ],
  },
  {
    id: "giveback",
    title: "13. Community Give-Back",
    blocks: [
      {
        type: "p",
        text: "GL1TCH runs a small, real, fully transparent give-back through a dedicated public Solana wallet that anyone can inspect on Solscan. It is funded modestly from the disclosed dev buy / community allocation, directed toward digital-literacy and open-internet / open-source initiatives chosen by the community via Signal Votes, and disbursed quarterly with each transaction signature published. Every claim is backed by an on-chain transaction — verifiability over PR.",
      },
    ],
  },
  {
    id: "roadmap",
    title: "14. Roadmap",
    blocks: [
      {
        type: "list",
        items: [
          "Phase 1–3 — Myth, Network, Launch (DONE): brand + lore, premium site, Telegram bot + ranks framework, and a fair Token-2022 zero-tax launch with authorities revoked and a live Trust Wall.",
          "Phase 4 — Ship the Scanner (DONE): free multi-chain safety scanner (web + Telegram), Watchtower alerts, AI verdict, verified blue-chips, compare, shareable cards + embeddable badge, and the public Proof self-scan.",
          "Phase 5 — Scale & Entrench (ACTIVE): holder-gated depth, free listings (GeckoTerminal live), the content flywheel, and public-API adoption as volume justifies.",
          "Phase 6 — Quantum Core (DONE): Vault, Draw, Seal, Forge, and verifiable Randomness-as-a-service + provably-fair Allocation, all non-custodial with a tamper-evident public Beacon and in-browser verification.",
          "Phase 7 — Make the Token Required (ACTIVE): metered $GL1TCH-gated API keys and holder-gated randomness are live; the honest, staged value-accrual mechanism (route real revenue to holders via fee→buyback / fee-share) and a third-party audit of the crypto + non-custodial claims are planned, activating only on real revenue + audit + founder approval.",
        ],
      },
    ],
  },
  {
    id: "verify",
    title: "15. How To Verify GL1TCH",
    blocks: [
      {
        type: "p",
        text: "Do not trust — verify. After launch, any holder can independently confirm every core claim in minutes:",
      },
      {
        type: "list",
        items: [
          "Get the contract address (CA) only from the official links page. Before launch, no CA exists — anyone selling is a scam.",
          "Open the CA on Solscan: confirm mint authority and freeze authority both show as revoked/none.",
          "Confirm total supply equals 1,000,000,000 and that no further minting is possible.",
          "Check liquidity is burned or locked (LP burn transaction signature is published).",
          "Open the CA on RugCheck and SolSniffer and read the automated risk score.",
          "Inspect the public treasury and give-back wallets on Solscan.",
        ],
      },
    ],
  },
  {
    id: "positioning",
    title: "16. Competitive Positioning",
    blocks: [
      {
        type: "p",
        text: "GL1TCH adopts the proven trust mechanics of mature projects and improves on them through focus and a modern, zero-friction Solana stance. The matrix below contrasts our approach with two common archetypes.",
      },
      {
        type: "table",
        headers: [
          "Dimension",
          "GL1TCH",
          "Sprawling utility token",
          "Hype-only meme",
        ],
        rows: [
          ["Focus", "One flagship utility", "Many products, diluted", "None"],
          ["Tax", "0%", "Often 0.3%+", "Varies"],
          ["Chain", "Solana (fast, cheap)", "Often ETH/BSC (gas)", "Varies"],
          ["Supply transparency", "FDV = market cap", "Vesting unlocks", "Often opaque"],
          ["Vesting overhang", "None", "Multi-year cliffs", "Varies"],
          ["Renounced", "Mint + freeze revoked", "Sometimes", "Rarely"],
          ["Trust proof", "On-chain + RugCheck", "Audit reports", "Usually none"],
          ["Give-back", "Public on-chain wallet", "Opaque claims", "None"],
        ],
      },
    ],
  },
  {
    id: "risk",
    title: "17. Risk Disclosures",
    blocks: [
      {
        type: "p",
        text: "$GL1TCH is a high-risk, internet-native asset. The following risks are material and non-exhaustive. Do your own research and never commit funds you cannot afford to lose entirely.",
      },
      {
        type: "list",
        items: [
          "Market risk: extreme volatility; the token may lose all value. Value is driven by attention and community, not cash flows.",
          "Liquidity risk: thin liquidity can cause large price impact and slippage.",
          "Concentration risk: a small number of wallets may hold a large share, affecting price and sentiment.",
          "Smart-contract / platform risk: dependencies on Solana, Pump.fun, Raydium, and wallet software carry their own risks.",
          "Regulatory risk: the legal treatment of tokens varies by jurisdiction and may change.",
          "Operational risk: key compromise or infrastructure failure, mitigated by multisig custody and an incident plan.",
        ],
      },
    ],
  },
  {
    id: "legal",
    title: "18. Legal, Compliance & Impersonation Policy",
    blocks: [
      {
        type: "p",
        text: "$GL1TCH is a community-driven, internet-native meme brand and token. It is not a security, investment contract, or financial product, and nothing in this document or any GL1TCH channel constitutes financial, legal, or tax advice. No profit is promised or implied. You are responsible for compliance with the laws of your jurisdiction; the token is not offered where prohibited.",
      },
      {
        type: "p",
        text: "Impersonation & scam policy: the only official links are those published on the official links page. Admins never DM first. Before launch, no contract exists — anyone selling $GL1TCH is a scam. Report impersonators through official channels.",
      },
    ],
  },
];
