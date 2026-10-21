// Read-only wallet connection over Mobile Wallet Adapter. GL1TCH only asks the wallet for its address
// (and, optionally, a Sign In With Solana message to prove ownership). It never requests a transaction
// signature. On Seeker the sign-in message is signed by the Seed Vault-backed wallet.
import { transact } from "@solana-mobile/mobile-wallet-adapter-protocol";
import bs58 from "bs58";

const IDENTITY = { name: "GL1TCH", uri: "https://gl1tchbased.xyz", icon: "favicon.ico" };
// Public RPCs tried in order. Token-account lookups are "indexed" requests that some free endpoints refuse
// without a key (publicnode does since Oct 2026), so the official endpoint goes first.
const RPCS = ["https://api.mainnet-beta.solana.com", "https://solana-rpc.publicnode.com"];
const TOKEN_PROGRAMS = [
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA", // SPL Token
  "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb", // Token-2022
];

export interface Connected {
  address: string; // base58
  signedIn: boolean; // a Sign In With Solana message was signed
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = globalThis.atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// Wallets return either a base64 address (MWA) or a Wallet Standard account with publicKey bytes.
function toBase58(account: unknown): string {
  const a = account as { address: string; publicKey?: Uint8Array };
  if (a.publicKey && a.publicKey.length === 32) return bs58.encode(a.publicKey);
  try {
    const bytes = base64ToBytes(a.address);
    if (bytes.length === 32) return bs58.encode(bytes);
  } catch {
    /* not base64: already base58 */
  }
  return a.address;
}

/** Ask the wallet for its address. With `signIn`, also request a Sign In With Solana message (no transaction). */
export async function connectWallet(signIn: boolean): Promise<Connected> {
  return transact(async (wallet) => {
    const auth = await wallet.authorize({
      chain: "solana:mainnet",
      identity: IDENTITY,
      ...(signIn
        ? {
            sign_in_payload: {
              domain: "gl1tchbased.xyz",
              statement: "Sign in to GL1TCH to get Watchtower alerts for your tokens. This is a message, not a transaction: it moves no funds.",
              uri: "https://gl1tchbased.xyz",
            },
          }
        : {}),
    });
    const account = auth.accounts[0];
    if (!account) throw new Error("The wallet returned no account.");
    return { address: toBase58(account), signedIn: !!auth.sign_in_result };
  });
}

export interface Holding {
  mint: string;
  amount: number;
}

type TokenAccount = { account?: { data?: { parsed?: { info?: { mint?: string; tokenAmount?: { uiAmount?: number | null } } } } } };

// One token program's accounts, from the first RPC that answers. Throws if none do, so a refused
// lookup is never shown as "no tokens".
async function tokenAccounts(owner: string, programId: string): Promise<TokenAccount[]> {
  let lastError = "no RPC answered";
  for (const rpc of RPCS) {
    try {
      const res = await fetch(rpc, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "getTokenAccountsByOwner",
          params: [owner, { programId }, { encoding: "jsonParsed" }],
        }),
      });
      const j = await res.json();
      if (Array.isArray(j?.result?.value)) return j.result.value;
      lastError = j?.error?.message || `HTTP ${res.status}`;
    } catch (e) {
      lastError = (e as Error).message;
    }
  }
  throw new Error(`Couldn't read the wallet's tokens (${lastError}).`);
}

/** Every token the wallet holds a non-zero balance of (SPL Token + Token-2022), largest first. */
export async function holdings(owner: string): Promise<Holding[]> {
  const all: Holding[] = [];
  for (const programId of TOKEN_PROGRAMS) {
    for (const acc of await tokenAccounts(owner, programId)) {
      const info = acc?.account?.data?.parsed?.info;
      const amount = Number(info?.tokenAmount?.uiAmount ?? 0);
      if (info?.mint && amount > 0) all.push({ mint: info.mint, amount });
    }
  }
  return all.sort((a, b) => b.amount - a.amount);
}
