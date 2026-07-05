import { describe, it, expect } from "vitest";
import { computeXp, signalBadge, SCAN_CAP } from "./xp.js";

describe("computeXp", () => {
  it("is zero for an unverified, referral-less user", () => {
    expect(computeXp({ verifiedTierRank: 0, confirmed: false, referrals: 0 })).toBe(0);
  });

  it("values a confirmed tier at 2x a provisional one", () => {
    const prov = computeXp({ verifiedTierRank: 3, confirmed: false, referrals: 0 });
    const conf = computeXp({ verifiedTierRank: 3, confirmed: true, referrals: 0 });
    expect(prov).toBe(180); // 3 * 60
    expect(conf).toBe(360); // 3 * 120
  });

  it("adds referral XP", () => {
    expect(computeXp({ verifiedTierRank: 0, confirmed: false, referrals: 4 })).toBe(100); // 4 * 25
  });

  it("caps scan XP to prevent submission farming", () => {
    const overCap = computeXp({ verifiedTierRank: 0, confirmed: false, referrals: 0, distinctScans: SCAN_CAP + 100 });
    expect(overCap).toBe(SCAN_CAP * 5);
  });

  it("clamps a nonsense tier into range", () => {
    expect(computeXp({ verifiedTierRank: 99, confirmed: true, referrals: 0 })).toBe(5 * 120);
    expect(computeXp({ verifiedTierRank: -3, confirmed: true, referrals: 0 })).toBe(0);
  });
});

describe("signalBadge", () => {
  it("maps XP to the highest badge threshold met", () => {
    expect(signalBadge(0)).toBe("Dormant");
    expect(signalBadge(49)).toBe("Dormant");
    expect(signalBadge(50)).toBe("Signal");
    expect(signalBadge(250)).toBe("Amplifier");
    expect(signalBadge(600)).toBe("Beacon");
    expect(signalBadge(1200)).toBe("Beacon Prime");
    expect(signalBadge(99999)).toBe("Beacon Prime");
  });
});
