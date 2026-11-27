import { describe, it, expect } from "vitest";
import { describeScanSource, maskIp, scanKind } from "./scan-source";

const MINT = "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263";
const OWN = "OwnContract1111111111111111111111111111111";
const BROWSER = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36";
const req = (headers: Record<string, string>) => new Request("https://gl1tchbased.xyz/api/scan", { headers });

describe("scanKind — who counts as a person", () => {
  it("counts a scan started on our website (same-origin browser request)", () => {
    expect(scanKind(req({ "sec-fetch-site": "same-origin", "user-agent": BROWSER }), MINT, OWN)).toBe("user");
  });

  it("counts a manual scan from our Android app", () => {
    expect(scanKind(req({ "x-gl1tch-client": "gl1tch-android", "user-agent": "okhttp/4.9.2" }), MINT, OWN)).toBe("user");
  });

  it("does NOT count scripts calling the API directly (what inflated the counter in Nov 2026)", () => {
    expect(scanKind(req({ "user-agent": "node" }), MINT, OWN)).toBe("auto");
    expect(scanKind(req({ "user-agent": "Bun/1.4.2" }), MINT, OWN)).toBe("auto");
    expect(scanKind(req({}), MINT, OWN)).toBe("auto");
    // A browser on another site calling our API cross-origin is not our front end either.
    expect(scanKind(req({ "sec-fetch-site": "cross-site", "user-agent": BROWSER }), MINT, OWN)).toBe("auto");
    // Same-origin claim without a browser user agent: not a browser.
    expect(scanKind(req({ "sec-fetch-site": "same-origin", "user-agent": "node" }), MINT, OWN)).toBe("auto");
  });

  it("keeps tagged automation and self-checks automated, even from the app or the website", () => {
    expect(scanKind(req({ "x-gl1tch-source": "mobile-watch", "x-gl1tch-client": "gl1tch-android" }), MINT, OWN)).toBe("auto");
    expect(scanKind(req({ "x-gl1tch-source": "preview", "sec-fetch-site": "same-origin", "user-agent": BROWSER }), MINT, OWN)).toBe("auto");
    expect(scanKind(req({ "sec-fetch-site": "same-origin", "user-agent": BROWSER }), OWN, OWN)).toBe("auto");
  });
});

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
