/**
 * Signal Graph v0 (PREMIUM-PLAN-v3, Phase 0) — pure logic.
 *
 * Our proprietary memory across every token we scan: which deployer shipped which token,
 * and how it scored. External APIs forget; the Signal Graph remembers. Once a wallet has
 * shipped multiple tokens we've flagged, *any* fresh token from it inherits that track
 * record — a signal no single-token scanner (RugCheck, GoPlus) can produce.
 *
 * Pure and side-effect-free; persistence lives in ./store.ts. Verdicts are the scanner's
 * own strings so this stays decoupled from the scoring engine.
 */

/** Verdicts the scanner emits that we treat as "this token was dangerous". */
const BAD_VERDICTS = new Set(["HIGH RISK", "RUG-SHAPED"]);

export interface Observation {
  deployer: string;
  chain: string;
  mint: string;
  verdict: string;
  score: number | null;
  name?: string | null;
  symbol?: string | null;
  ts: number;
}

export interface TokenSighting {
  mint: string;
  verdict: string;
  score: number | null;
  name?: string | null;
  symbol?: string | null;
  ts: number;
}

export interface DeployerRecord {
  deployer: string;
  chain: string;
  firstSeen: number;
  lastSeen: number;
  tokens: TokenSighting[];
}

export type ReputationLevel = "unknown" | "clean" | "watch" | "serial";

export interface DeployerReputation {
  deployer: string;
  chain: string;
  tokensSeen: number;
  flaggedCount: number; // tokens by this deployer we scored HIGH RISK / RUG-SHAPED
  worstScore: number | null;
  level: ReputationLevel;
  note: string; // plain-language, probabilistic (never accusatory)
  recent: TokenSighting[]; // most-recent few, for display
}

const MAX_TOKENS = 60; // cap history per deployer (keep newest)
const key = (deployer: string, chain: string) => `${chain}:${deployer}`;
export const deployerKey = key;

/** Fold a new observation into a deployer's record (dedupe by mint, keep the latest read). */
export function applyObservation(
  rec: DeployerRecord | undefined,
  obs: Observation
): DeployerRecord {
  const base: DeployerRecord =
    rec ?? { deployer: obs.deployer, chain: obs.chain, firstSeen: obs.ts, lastSeen: obs.ts, tokens: [] };

  const sighting: TokenSighting = {
    mint: obs.mint,
    verdict: obs.verdict,
    score: obs.score,
    name: obs.name ?? null,
    symbol: obs.symbol ?? null,
    ts: obs.ts,
  };

  // Replace an existing sighting of the same mint (a re-scan) with the newer read.
  const tokens = base.tokens.filter((t) => t.mint !== obs.mint);
  tokens.push(sighting);
  tokens.sort((a, b) => b.ts - a.ts); // newest first
  if (tokens.length > MAX_TOKENS) tokens.length = MAX_TOKENS;

  return {
    deployer: base.deployer,
    chain: base.chain,
    firstSeen: Math.min(base.firstSeen, obs.ts),
    lastSeen: Math.max(base.lastSeen, obs.ts),
    tokens,
  };
}

/**
 * Reputation of a deployer, optionally *excluding* the mint currently being scanned so a
 * token never counts itself. Probabilistic, plain-language — matches projects' behaviour,
 * never labels a person.
 */
export function reputation(
  rec: DeployerRecord | undefined,
  opts: { excludeMint?: string } = {}
): DeployerReputation {
  const chain = rec?.chain ?? "";
  const deployer = rec?.deployer ?? "";
  const tokens = (rec?.tokens ?? []).filter((t) => t.mint !== opts.excludeMint);

  const tokensSeen = tokens.length;
  const flagged = tokens.filter((t) => BAD_VERDICTS.has(t.verdict));
  const flaggedCount = flagged.length;
  const worstScore = tokens.reduce<number | null>(
    (min, t) => (typeof t.score === "number" ? (min === null ? t.score : Math.min(min, t.score)) : min),
    null
  );

  let level: ReputationLevel;
  let note: string;
  if (tokensSeen === 0) {
    level = "unknown";
    note = "First token we've seen from this deployer — no track record yet.";
  } else if (flaggedCount >= 2) {
    level = "serial";
    note = `This deployer has launched ${flaggedCount} tokens we've flagged as high-risk. Repeat-launch behaviour that matches serial rug operators — treat anything new from this wallet with extreme caution.`;
  } else if (flaggedCount === 1) {
    level = "watch";
    note = `This deployer has one prior token we flagged as high-risk. Not proof of intent, but worth extra scrutiny.`;
  } else {
    level = "clean";
    note = `We've seen ${tokensSeen} token${tokensSeen === 1 ? "" : "s"} from this deployer and flagged none as high-risk so far.`;
  }

  return {
    deployer,
    chain,
    tokensSeen,
    flaggedCount,
    worstScore,
    level,
    note,
    recent: tokens.slice(0, 5),
  };
}

/** True for observations worth recording (need a deployer + a confident, meaningful read). */
export function isRecordable(obs: Partial<Observation>): obs is Observation {
  return (
    typeof obs.deployer === "string" && obs.deployer.length > 0 &&
    typeof obs.chain === "string" && obs.chain.length > 0 &&
    typeof obs.mint === "string" && obs.mint.length > 0 &&
    typeof obs.verdict === "string" && obs.verdict.length > 0 &&
    typeof obs.ts === "number"
  );
}
