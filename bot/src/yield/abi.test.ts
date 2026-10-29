import { describe, it, expect } from "vitest";
import { pad32, words, wordToAddress, encodeCall } from "./abi.js";

const USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";

describe("abi helpers", () => {
  it("splits return data into 32-byte words", () => {
    expect(words("0x" + "00".repeat(31) + "2a" + "00".repeat(32))).toEqual([42n, 0n]);
    expect(words("0x")).toEqual([]);
  });

  it("left-pads an address to one lowercase word", () => {
    const p = pad32(USDC);
    expect(p).toHaveLength(64);
    expect(p).toBe("000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48");
  });

  it("reads an address out of a word", () => {
    expect(wordToAddress(BigInt("0x98c23e9d8f34fefb1b7bd6a91b7ff122f4e16f5c"))).toBe("0x98c23e9d8f34fefb1b7bd6a91b7ff122f4e16f5c");
    expect(wordToAddress(0n)).toBe("0x" + "0".repeat(40));
  });

  it("encodes a call as selector + padded args", () => {
    expect(encodeCall("0x35ea6a75", USDC)).toBe("0x35ea6a75" + pad32(USDC));
    expect(encodeCall("0x18160ddd")).toBe("0x18160ddd");
  });
});
