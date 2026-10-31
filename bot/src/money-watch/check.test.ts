import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { PublicKey } from "@solana/web3.js";
import { PINS, REPEAT_MS, balanceDrops, delegateProblems, planAlerts, referralProblems, siteProblems, vaultProblems } from "./check.js";

const ULTRA = PINS.referrals[0];
const THIEF = "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU";

function account(owner: string, project: string = ULTRA.project, shareBps: number = ULTRA.shareBps): Uint8Array {
  const data = new Uint8Array(274);
  data.set(new PublicKey(owner).toBytes(), 8);
  data.set(new PublicKey(project).toBytes(), 40);
  new DataView(data.buffer).setUint16(72, shareBps, true);
  return data;
}

describe("the pins match what the site publishes", () => {
  const official = fs.readFileSync(path.resolve(__dirname, "../../../src/lib/official.ts"), "utf8");

  it("has the same addresses", () => {
    expect(official).toContain(`REFERRAL_ACCOUNT = "${ULTRA.address}"`);
    expect(official).toContain(`PAY_TO_BASE = "${PINS.payToBase}"`);
    expect(official).toContain(`DEPLOYER_WALLET = "${PINS.payToSolana}"`);
    const partner = official.match(/REFERRAL_PARTNER: string = (\w+|"\w+");/)?.[1];
    if (partner === "ATTESTER_WALLET") expect(official).toContain(`ATTESTER_WALLET = "${PINS.partner}"`);
    else expect(partner).toBe(`"${PINS.partner}"`);
  });
});

describe("referralProblems", () => {
  it("is quiet when the owner, project and share are as pinned", () => {
    expect(referralProblems(ULTRA, account(PINS.partner))).toEqual([]);
  });

  it("alerts when the vault's owner changes", () => {
    const [problem] = referralProblems(ULTRA, account(THIEF));
    expect(problem.text).toContain("SAHİBİ DEĞİŞTİ");
    expect(problem.text).toContain(THIEF);
  });

  it("alerts on a lowered share, another project, a missing or short account", () => {
    expect(referralProblems(ULTRA, account(PINS.partner, ULTRA.project, 100))[0].id).toMatch(/share/);
    expect(referralProblems(ULTRA, account(PINS.partner, THIEF))[0].id).toMatch(/project/);
    expect(referralProblems(ULTRA, null)).toHaveLength(1);
    expect(referralProblems(ULTRA, new Uint8Array(10))).toHaveLength(1);
  });
});

describe("vaultProblems", () => {
  it("is quiet while the vault isn't open, or is open and clean", () => {
    expect(vaultProblems(null)).toEqual([]);
    expect(vaultProblems({ owner: ULTRA.address })).toEqual([]);
  });

  it("alerts on another owner, a delegate or a close authority", () => {
    expect(vaultProblems({ owner: THIEF })[0].id).toBe("vault:owner");
    expect(vaultProblems({ owner: ULTRA.address, delegate: THIEF })[0].id).toBe("vault:delegate");
    expect(vaultProblems({ owner: ULTRA.address, closeAuthority: THIEF })[0].id).toBe("vault:close");
  });
});

describe("delegateProblems", () => {
  it("alerts when a token account lets another wallet spend", () => {
    expect(delegateProblems("Deployer", [{ delegate: THIEF }, {}])).toHaveLength(1);
    expect(delegateProblems("Deployer", [{}])).toEqual([]);
  });
});

describe("siteProblems", () => {
  it("alerts when a signing page is back or x402 pays elsewhere", () => {
    expect(siteProblems({ signingPages: { "/revenue/setup": 200 } })[0].text).toContain("/revenue/setup");
    expect(siteProblems({ signingPages: {}, payTo: [THIEF] })[0].text).toContain(THIEF);
  });

  it("is quiet when pages are gone, the wallets are pinned, or the site didn't answer", () => {
    expect(siteProblems({ signingPages: { "/revenue/setup": 404, "/x": undefined }, payTo: [PINS.payToSolana, PINS.payToBase] })).toEqual([]);
  });
});

describe("balanceDrops", () => {
  it("reports real drops and ignores memo fees, rises and new keys", () => {
    const before = { "Deployer SOL": 1, "Deployer USDC": 6, "Deployer GL1TCH": 100, "Kasa SOL": 0.04 };
    expect(balanceDrops(before, { "Deployer SOL": 0.9, "Deployer USDC": 6.5, "Deployer GL1TCH": 99, "Kasa SOL": 0.03999 })).toEqual([
      "Deployer SOL azaldı: 1 -> 0.9.",
      "Deployer GL1TCH azaldı: 100 -> 99.",
    ]);
    expect(balanceDrops({}, { "Deployer SOL": 1 })).toEqual([]);
  });
});

describe("planAlerts", () => {
  const problem = { id: "a", text: "sorun" };

  it("sends a new problem once, again after six hours, and says when it clears", () => {
    const first = planAlerts({ open: {} }, [problem], 1000);
    expect(first.messages).toEqual(["sorun"]);
    const quiet = planAlerts(first.state, [problem], 2000);
    expect(quiet.messages).toEqual([]);
    expect(quiet.state.open.a).toBe(1000);
    expect(planAlerts(quiet.state, [problem], 1000 + REPEAT_MS).messages).toEqual(["sorun"]);
    expect(planAlerts(quiet.state, [], 3000).messages).toEqual(["Düzeldi: a"]);
  });
});
