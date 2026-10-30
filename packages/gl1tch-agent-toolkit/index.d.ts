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
  scanToken(args: { mint: string; chain?: string }): Promise<unknown>;
  quickCheck(args: { mint: string; chain?: string }): Promise<unknown>;
  batchScan(args: { mints: string[] | string; chain?: string }): Promise<unknown>;
  yieldXRay(args?: { chain?: string; kind?: string; stable?: boolean; id?: string }): Promise<unknown>;
  deployerReputation(args: { address: string; chain?: string }): Promise<unknown>;
  agentTrust(args: { address: string; chain?: string }): Promise<unknown>;
  rugRadar(args?: { since?: number }): Promise<unknown>;
  verifiableRandom(args?: { min?: number; max?: number; count?: number; salt?: string }): Promise<unknown>;
}

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
};

