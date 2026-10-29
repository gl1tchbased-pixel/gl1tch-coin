/** Minimal EVM ABI helpers for static calls: enough for address/uint arguments and word-sized returns. */

/** One 32-byte word (64 hex chars, no 0x) holding an address or a hex number, left-padded. */
export function pad32(hexOrAddress: string): string {
  return hexOrAddress.toLowerCase().replace(/^0x/, "").padStart(64, "0");
}

/** Return data split into 32-byte words. */
export function words(hex: string): bigint[] {
  return (hex.replace(/^0x/, "").match(/.{64}/g) ?? []).map((w) => BigInt("0x" + w));
}

export function wordToAddress(w: bigint): string {
  return "0x" + (w & ((1n << 160n) - 1n)).toString(16).padStart(40, "0");
}

/** `selector` (0x + 8 hex) followed by each argument as one word. */
export function encodeCall(selector: string, ...args: string[]): string {
  return selector + args.map(pad32).join("");
}
