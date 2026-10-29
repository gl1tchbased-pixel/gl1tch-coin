import { describe, it, expect } from "vitest";
import type { SupportedResponse } from "@x402/core/types";
import { pinSvmFeePayer } from "./fee-payer";

const SOL = "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp";
const kind = (feePayer: string, network = SOL) => ({ x402Version: 2, scheme: "exact", network, extra: { feePayer } });
const supported = (offered: string, signers: Record<string, string[]>): SupportedResponse =>
  ({ kinds: [kind(offered), { x402Version: 2, scheme: "exact", network: "eip155:8453" }], extensions: [], signers }) as SupportedResponse;

describe("pinSvmFeePayer", () => {
  it("gives every instance the same fee payer, whichever one the facilitator offered", () => {
    const pool = ["D6ZhtNQ5xxx", "BENrLoUbxxx", "GVJJ7rxxx"];
    const a = pinSvmFeePayer(supported("D6ZhtNQ5xxx", { "solana:*": pool }));
    const b = pinSvmFeePayer(supported("GVJJ7rxxx", { "solana:*": [...pool].reverse() }));
    expect(a.kinds[0].extra?.feePayer).toBe("BENrLoUbxxx");
    expect(b.kinds[0].extra?.feePayer).toBe("BENrLoUbxxx");
  });

  it("reads an exact-network signer list too, and keeps the other extra fields", () => {
    const s = supported("Zzz", { [SOL]: ["Zzz", "Aaa"] });
    s.kinds[0].extra = { feePayer: "Zzz", recentBlockhash: "h" };
    expect(pinSvmFeePayer(s).kinds[0].extra).toEqual({ feePayer: "Aaa", recentBlockhash: "h" });
  });

  it("leaves a kind alone when the signer list doesn't contain the offered fee payer, and never touches EVM", () => {
    expect(pinSvmFeePayer(supported("Offered", { "solana:*": ["Other"] })).kinds[0].extra?.feePayer).toBe("Offered");
    expect(pinSvmFeePayer(supported("Offered", {})).kinds[0].extra?.feePayer).toBe("Offered");
    expect(pinSvmFeePayer(supported("Offered", { "solana:*": ["Offered", "Aaa"] })).kinds[1]).toEqual({ x402Version: 2, scheme: "exact", network: "eip155:8453" });
  });
});
