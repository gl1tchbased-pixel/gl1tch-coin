import { describe, it, expect } from "vitest";
import {
  CONTRACT_ADDRESS,
  CURRENT_LAUNCH_STATUS,
  LAUNCH_STATUS,
  links,
  TRUST_REPORT,
  DISCLAIMER,
  IMPERSONATION_WARNING,
  GIVEBACK_WALLET,
} from "./official";

const hasCA = Boolean(CONTRACT_ADDRESS);
const preLaunch = CURRENT_LAUNCH_STATUS === LAUNCH_STATUS.PRE_LAUNCH;

describe("derived links", () => {
  const market = [links.explorer, links.dexscreener, links.pumpfun, links.rugcheck];

  it("are empty until a contract address exists, and embed it once set", () => {
    for (const url of market) {
      if (hasCA) expect(url).toContain(CONTRACT_ADDRESS);
      else expect(url).toBe("");
    }
  });

  it("derives the give-back explorer link only when the wallet is set", () => {
    if (GIVEBACK_WALLET) expect(links.givebackWallet).toContain(GIVEBACK_WALLET);
    else expect(links.givebackWallet).toBe("");
  });
});

describe("trust report", () => {
  it("never hardcodes a verified guarantee before launch", () => {
    if (!hasCA) {
      expect(TRUST_REPORT.mintRevoked).toBe(false);
      expect(TRUST_REPORT.freezeRevoked).toBe(false);
      expect(TRUST_REPORT.lpBurnedOrLocked).toBe(false);
      expect(TRUST_REPORT.rugcheckScore).toBeNull();
    }
  });

  it("keeps a score that is either null or a number", () => {
    const s = TRUST_REPORT.rugcheckScore;
    expect(s === null || typeof s === "number").toBe(true);
  });
});

describe("compliance copy", () => {
  it("disclaims financial advice and security status", () => {
    const d = DISCLAIMER.toLowerCase();
    expect(d).toContain("financial advice");
    expect(d).toContain("not a security");
  });

  it("always warns that admins never DM first", () => {
    expect(IMPERSONATION_WARNING.toLowerCase()).toContain("never dm");
  });

  it("warns that any seller is a scam while pre-launch", () => {
    if (preLaunch) expect(IMPERSONATION_WARNING.toLowerCase()).toContain("scam");
  });
});
