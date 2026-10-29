import { EVM_RPC, SOLANA_PUBLIC_RPC, type EvmChain } from "./registry.js";

/** Read-only JSON-RPC access for the yield collector. Injected so adapters can be tested with recorded data. */
export interface Rpc {
  evmCall(chain: EvmChain, to: string, data: string): Promise<string>;
  evmRaw(chain: EvmChain, method: string, params: unknown[]): Promise<unknown>;
  solana(method: string, params: unknown[]): Promise<unknown>;
}

async function post(url: string, method: string, params: unknown[], timeoutMs: number): Promise<unknown> {
  const r = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const j = (await r.json()) as { result?: unknown; error?: { message?: string } };
  if (j.error) throw new Error(j.error.message ?? "rpc error");
  return j.result;
}

async function firstOk(label: string, urls: string[], method: string, params: unknown[], timeoutMs: number): Promise<unknown> {
  let last = "no endpoint";
  for (const url of urls) {
    try {
      return await post(url, method, params, timeoutMs);
    } catch (e) {
      last = (e as Error).message;
    }
  }
  throw new Error(`rpc ${label}: ${last}`);
}

export function createRpc(opts: { solanaUrl?: string; timeoutMs?: number } = {}): Rpc {
  const timeoutMs = opts.timeoutMs ?? 12_000;
  const solanaUrls = [...new Set([opts.solanaUrl ?? process.env.SOLANA_RPC ?? SOLANA_PUBLIC_RPC, SOLANA_PUBLIC_RPC])];
  return {
    evmRaw: (chain, method, params) => firstOk(chain, EVM_RPC[chain], method, params, timeoutMs),
    async evmCall(chain, to, data) {
      const res = await firstOk(chain, EVM_RPC[chain], "eth_call", [{ to, data }, "latest"], timeoutMs);
      if (typeof res !== "string") throw new Error(`rpc ${chain}: non-hex eth_call result`);
      return res;
    },
    solana: (method, params) => firstOk("solana", solanaUrls, method, params, timeoutMs),
  };
}
