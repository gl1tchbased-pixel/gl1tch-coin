export const DEFAULT_BASE_URL: string;

export interface Gl1tchClientOptions {
  baseUrl?: string;
  apiKey?: string;
  useX402?: boolean;
  fetch?: typeof fetch;
}

export class Gl1tchClient {
  baseUrl: string;
  apiKey: string;
  useX402: boolean;
  constructor(opts?: Gl1tchClientOptions);
  scanToken(args: { mint: string; chain?: string }): Promise<any>;
  quickCheck(args: { mint: string; chain?: string }): Promise<any>;
  batchScan(args: { mints: string[] | string; chain?: string }): Promise<any>;
  tokenVerdict(args: { mint: string; chain?: string }): Promise<any>;
  yieldXRay(args?: { chain?: string; kind?: string; stable?: boolean; id?: string }): Promise<any>;
  deployerReputation(args: { address: string; chain?: string }): Promise<any>;
  agentTrust(args: { address: string; chain?: string }): Promise<any>;
  rugRadar(args?: { since?: number }): Promise<any>;
  verifiableRandom(args?: { min?: number; max?: number; count?: number; salt?: string }): Promise<any>;
}

export interface PreTradeGuardResult {
  approved: boolean;
  score: number;
  verdict: string;
  reason: string;
  mint: string;
  chain: string;
  details: any;
}

export function gl1tchPreTradeGuard(
  mint: string,
  opts?: { minScore?: number; rejectHoneypot?: boolean; chain?: string; client?: Gl1tchClient } & Gl1tchClientOptions
): Promise<PreTradeGuardResult>;

export function gl1tchSafetyProvider(opts?: Gl1tchClientOptions | { client?: Gl1tchClient }): {
  get: (runtime: any, message: any, state: any) => Promise<string | null>;
};

export function gl1tchPreTradeEvaluator(opts?: Gl1tchClientOptions | { client?: Gl1tchClient }): {
  name: string;
  similes: string[];
  description: string;
  validate: () => Promise<boolean>;
  handler: (runtime: any, message: any) => Promise<any>;
};

export interface DrawWinnersOptions extends Gl1tchClientOptions {
  participants: string[];
  count?: number;
  salt?: string;
  client?: Gl1tchClient;
}

export function drawProvablyFairWinners(opts: DrawWinnersOptions): Promise<{
  winners: string[];
  round: number;
  signature: string;
  randomness: string;
  proofUrl: string;
  timestamp: number;
}>;

export function rollProvablyFairDice(opts?: {
  sides?: number;
  count?: number;
  salt?: string;
  client?: Gl1tchClient;
} & Gl1tchClientOptions): Promise<{
  rolls: number[];
  round: number;
  signature: string;
  proofUrl: string;
}>;

export function shuffleProvablyFair(opts: {
  items: any[];
  salt?: string;
  client?: Gl1tchClient;
} & Gl1tchClientOptions): Promise<{
  shuffled: any[];
  round: number;
  signature: string;
  proofUrl: string;
}>;

export function createRadarStreamListener(opts?: {
  onToken?: (token: any) => void;
  onSweep?: (sweep: any) => void;
  onError?: (err: any) => void;
  filter?: { cleanOnly?: boolean; minScore?: number };
  baseUrl?: string;
  key?: string;
}): { close: () => void };

export function verifyAgentTrust(opts: {
  address: string;
  chain?: string;
  requiredLevel?: "trusted" | "neutral" | "caution";
  client?: Gl1tchClient;
} & Gl1tchClientOptions): Promise<{
  isTrusted: boolean;
  score: number;
  level: string;
  reasons: string[];
  badges: string[];
  proven: boolean;
  erc8004Url: string;
}>;

export interface AgentToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  execute: (args: Record<string, unknown>) => Promise<unknown>;
}

export function createSolanaAgentKitTools(opts?: Gl1tchClientOptions | Gl1tchClient): AgentToolDefinition[];

export function gl1tchElizaPlugin(opts?: Gl1tchClientOptions | Gl1tchClient): {
  name: string;
  description: string;
  actions: Array<{
    name: string;
    similes: string[];
    description: string;
    validate: () => Promise<boolean>;
    handler: (
      runtime: unknown,
      message: unknown,
      state: unknown,
      options?: Record<string, unknown>,
      callback?: (res: { text: string; content: unknown }) => Promise<void>
    ) => Promise<unknown>;
    examples: unknown[];
  }>;
  providers: Array<{
    get: (runtime: any, message: any, state: any) => Promise<string | null>;
  }>;
  evaluators: Array<{
    name: string;
    similes: string[];
    description: string;
    validate: () => Promise<boolean>;
    handler: (runtime: any, message: any) => Promise<any>;
  }>;
};
