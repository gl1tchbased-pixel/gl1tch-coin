import { describe, it, expect } from "vitest";
import { clientIp, createLimiter, safeEqual } from "./limits.js";

const req = (headers: Record<string, string>, remoteAddress = "10.0.0.1") => ({ headers, socket: { remoteAddress } }) as never;

describe("clientIp", () => {
  it("prefers the proxy-set X-Real-IP", () => {
    expect(clientIp(req({ "x-real-ip": "203.0.113.7", "x-forwarded-for": "1.1.1.1, 203.0.113.7" }))).toBe("203.0.113.7");
  });
  it("uses the last X-Forwarded-For hop, not a forged first one", () => {
    expect(clientIp(req({ "x-forwarded-for": "6.6.6.6, 198.51.100.9" }))).toBe("198.51.100.9");
  });
  it("falls back to the socket", () => {
    expect(clientIp(req({}))).toBe("10.0.0.1");
  });
});

describe("safeEqual", () => {
  it("matches equal secrets only", () => {
    expect(safeEqual("abc123", "abc123")).toBe(true);
    expect(safeEqual("abc123", "abc124")).toBe(false);
    expect(safeEqual("abc", "abc123")).toBe(false);
  });
  it("never matches an empty or missing secret", () => {
    expect(safeEqual("", "")).toBe(false);
    expect(safeEqual(undefined, "x")).toBe(false);
  });
});

describe("createLimiter", () => {
  it("blocks a key past its limit and lets it back in after the window", () => {
    const l = createLimiter(60_000);
    for (let i = 0; i < 3; i++) expect(l.check("ip:r", 3, 1_000)).toBe(false);
    expect(l.check("ip:r", 3, 1_000)).toBe(true);
    expect(l.check("ip:r", 3, 62_000)).toBe(false);
  });
  it("keeps keys independent", () => {
    const l = createLimiter(60_000);
    expect(l.check("a", 1, 0)).toBe(false);
    expect(l.check("b", 1, 0)).toBe(false);
    expect(l.check("a", 1, 0)).toBe(true);
  });
  it("prunes idle keys so memory stays bounded", () => {
    const l = createLimiter(60_000);
    for (let i = 0; i < 999; i++) l.check(`ip${i}`, 5, 0);
    l.check("late", 5, 120_000); // the 1000th call runs the periodic prune; every old key is idle by now
    expect(l.size()).toBe(1);
  });
  it("stays bounded under a flood of distinct active keys", () => {
    const l = createLimiter(60_000, 10);
    for (let i = 0; i < 500; i++) l.check(`ip${i}`, 5, 0);
    expect(l.size()).toBeLessThanOrEqual(11);
  });
  it("never evicts a blocked key that is still hammering", () => {
    const l = createLimiter(60_000, 10);
    for (let i = 0; i < 4; i++) l.check("hot", 3, 0);
    for (let i = 0; i < 50; i++) {
      l.check(`fresh${i}`, 3, 0);
      expect(l.check("hot", 3, 0)).toBe(true);
    }
  });
  it("keeps blocking a hammering key and frees it once the window passes", () => {
    const l = createLimiter(60_000);
    for (let i = 0; i < 10_000; i++) l.check("ip", 3, 0);
    expect(l.check("ip", 3, 59_999)).toBe(true);
    expect(l.check("ip", 3, 120_000)).toBe(false);
  });
});
