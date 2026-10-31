import { VersionedTransaction } from "@solana/web3.js";

/**
 * Checks the transaction Jupiter built before we hand it to a wallet, so a hijacked API answer can't reach a user
 * through our domain. It reads the top level only: what a Jupiter router does inside its own program is Jupiter's.
 * An unknown router is refused, not waved through. The wallet's own preview remains the user's last check.
 */

const COMPUTE_BUDGET = "ComputeBudget111111111111111111111111111111";
const ASSOCIATED_TOKEN = "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL";
const SYSTEM = "11111111111111111111111111111111";
const TOKEN = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
const TOKEN_2022 = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";
const JUPITER_ROUTERS = new Set([
  "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4",
  "proVF4pMXVaYqmy4NjniPh4pqKNfMmsihgd4wdkCX3u",
]);

const SYSTEM_TRANSFER = 2;
const TOKEN_CLOSE_ACCOUNT = 9;
const TOKEN_SYNC_NATIVE = 17;

/** Room above the swap amount for tips. */
const MAX_EXTRA_TRANSFER_LAMPORTS = 5_000_000;
const MAX_PRIORITY_FEE_LAMPORTS = 10_000_000;
const DEFAULT_COMPUTE_UNITS = 1_400_000;

const u32 = (d: Uint8Array, at: number) => new DataView(d.buffer, d.byteOffset).getUint32(at, true);
const u64 = (d: Uint8Array, at: number) => Number(new DataView(d.buffer, d.byteOffset).getBigUint64(at, true));

/** Null when the transaction looks like the swap we asked for, else why it was refused. */
export function swapTxProblem(transactionBase64: string, expected: { taker: string; lamports: number }): string | null {
  let tx: VersionedTransaction;
  try {
    tx = VersionedTransaction.deserialize(Buffer.from(transactionBase64, "base64"));
  } catch {
    return "unreadable transaction";
  }
  const message = tx.message;
  const key = (index: number) => message.staticAccountKeys[index]?.toBase58();

  if (message.header.numRequiredSignatures !== 1 || key(0) !== expected.taker) return "the taker must be the only signer";

  let transferred = 0;
  let unitPrice = 0;
  let unitLimit = DEFAULT_COMPUTE_UNITS;
  for (const ix of message.compiledInstructions) {
    const program = key(ix.programIdIndex);
    if (!program) return "instruction without a program";
    const data = ix.data;
    switch (program) {
      case COMPUTE_BUDGET:
        if (data[0] === 2 && data.length >= 5) unitLimit = u32(data, 1);
        if (data[0] === 3 && data.length >= 9) unitPrice = u64(data, 1);
        break;
      case ASSOCIATED_TOKEN:
        break;
      case SYSTEM:
        if (data.length < 12 || u32(data, 0) !== SYSTEM_TRANSFER) return "unexpected system instruction";
        transferred += u64(data, 4);
        break;
      case TOKEN:
      case TOKEN_2022:
        // Approve, SetAuthority and Transfer at the top level are how a drainer takes a wallet's tokens.
        if (data[0] === TOKEN_CLOSE_ACCOUNT) {
          if (key(ix.accountKeyIndexes[1]) !== expected.taker) return "a closed account refunds someone else";
        } else if (data[0] !== TOKEN_SYNC_NATIVE) {
          return "unexpected token instruction";
        }
        break;
      default:
        if (!JUPITER_ROUTERS.has(program)) return `unknown program ${program}`;
    }
  }
  if (transferred > expected.lamports + MAX_EXTRA_TRANSFER_LAMPORTS) return "moves more SOL than the swap amount";
  if ((unitPrice * unitLimit) / 1e6 > MAX_PRIORITY_FEE_LAMPORTS) return "priority fee too high";
  return null;
}
