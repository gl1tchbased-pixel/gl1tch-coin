import { describe, it, expect, beforeAll } from "vitest";

let isAdmin: (userId: number | undefined) => boolean;

beforeAll(async () => {
  // config.ts validates required env at import time.
  process.env.BOT_TOKEN = "test-token";
  process.env.ADMIN_IDS = "111, 222 ,333";
  ({ isAdmin } = await import("./config.js"));
});

describe("isAdmin", () => {
  it("recognizes ids regardless of surrounding whitespace", () => {
    expect(isAdmin(111)).toBe(true);
    expect(isAdmin(222)).toBe(true);
    expect(isAdmin(333)).toBe(true);
  });

  it("rejects unknown ids", () => {
    expect(isAdmin(999)).toBe(false);
  });

  it("rejects undefined", () => {
    expect(isAdmin(undefined)).toBe(false);
  });
});
