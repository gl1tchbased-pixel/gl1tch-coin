import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { checkX402Health } from "./health";
import { PAY_TO_SOLANA, PAY_TO_BASE } from "@/lib/official";

describe("x402 automated health & spec linter", () => {
  beforeEach(() => {
    vi.stubEnv("X402_PAY_TO_SOLANA", PAY_TO_SOLANA);
    vi.stubEnv("X402_PAY_TO_BASE", PAY_TO_BASE);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("lints all 10 routes with 100% spec compliance and 0 format slips", async () => {
    const report = await checkX402Health();

    expect(report.status).toBe("healthy");
    expect(report.routesTotal).toBe(10);
    expect(report.routesHealthy).toBe(10);
    expect(report.specCompliancePct).toBe(100);
    expect(report.totalSlips).toBe(0);

    for (const route of report.routes) {
      expect(route.status).toBe("healthy");
      expect(route.httpStatus).toBe(402);
      expect(route.x402Version).toBe(2);
      expect(route.slips).toEqual([]);
      expect(route.networks).toContain("solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp");
      expect(route.networks).toContain("eip155:8453");
      expect(route.networks).toContain("eip155:42161");
      expect(route.networks).toContain("eip155:137");
      expect(route.networks).toContain("eip155:43114");
      expect(route.networks).toContain("eip155:1329");
    }

    expect(report.securityAdvisory.flaggedScamAddress).toBe("0x202B73254C28fA012BD11ff50425D94534b95594");
    expect(report.officialTreasuries.solana).toBe(PAY_TO_SOLANA);
    expect(report.officialTreasuries.base).toBe(PAY_TO_BASE);
  }, 30_000);

  it("serves the health report via GET /api/x402/health with security headers", async () => {
    const { GET } = await import("@/app/api/x402/health/route");
    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store, max-age=0");
    expect(res.headers.get("x-gl1tch-health")).toBe("healthy");
    expect(res.headers.get("x-spec-compliance")).toBe("100%");
    const data = await res.json();
    expect(data.status).toBe("healthy");
    expect(data.routesHealthy).toBe(10);
  }, 30_000);
});
