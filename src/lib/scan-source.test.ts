import { describe, it, expect } from "vitest";
import { describeScanSource, maskIp } from "./scan-source";

const MINT = "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263";

describe("scan source log line", () => {
  it("keeps only the network part of an IP", () => {
    expect(maskIp("203.0.113.7")).toBe("203.0.x.x");
    expect(maskIp("2001:db8:1::5")).toBe("2001:db8:…");
    expect(maskIp("unknown")).toBe("?");
  });

  it("describes a caller with coarse, printable fields only", () => {
    const req = new Request("https://gl1tchbased.xyz/api/scan", {
      headers: {
        "x-forwarded-for": "198.51.100.23, 10.0.0.1",
        "cf-ipcountry": "TR",
        referer: "https://dexscreener.com/solana/abc?x=1",
        "user-agent": "Mozilla/5.0 (Linux; Android 16)",
      },
    });
    const line = describeScanSource(req, MINT);
    expect(line).toBe(
      'mint=DezXAZ…B263 net=198.51.x.x country=TR ref=dexscreener.com ua="Mozilla/5.0 (Linux; Android 16)"'
    );
    expect(line).not.toContain("198.51.100.23");
  });

  it("marks missing headers instead of failing", () => {
    const line = describeScanSource(new Request("https://gl1tchbased.xyz/api/scan"), MINT);
    expect(line).toBe('mint=DezXAZ…B263 net=? country=- ref=- ua="-"');
  });
});
