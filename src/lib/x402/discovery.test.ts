import { describe, it, expect } from "vitest";
import { buildOpenApi, wellKnownX402, bazaarDiscovery } from "./discovery";
import { PAID_ROUTES, type PaidRouteId } from "./config";

const ORIGIN = "https://gl1tchbased.xyz";
const IDS = Object.keys(PAID_ROUTES) as PaidRouteId[];

type Op = {
  operationId: string;
  parameters: Array<{ name: string; in: string; required: boolean }>;
  "x-payment-info": { protocols: string[]; price: { mode: string; currency: string; amount: string } };
  responses: Record<string, unknown>;
};

describe("buildOpenApi — x402scan's OpenAPI-first discovery", () => {
  const doc = buildOpenApi(ORIGIN) as { openapi: string; info: { title: string; version: string }; servers: Array<{ url: string }>; paths: Record<string, { get: Op }> };

  it("has the required top-level fields", () => {
    expect(doc.openapi).toMatch(/^3\.1/);
    expect(typeof doc.info.title).toBe("string");
    expect(typeof doc.info.version).toBe("string");
    expect(doc.servers).toEqual([{ url: ORIGIN }]);
  });

  it("lists exactly the paid operations (free routes break registration)", () => {
    expect(Object.keys(doc.paths).sort()).toEqual(IDS.map((id) => PAID_ROUTES[id].path).sort());
  });

  it("declares x402 payment info with a fixed USD price in dollars, and a 402 response", () => {
    const scan = doc.paths["/api/x402/scan"].get;
    expect(scan["x-payment-info"]).toEqual({ protocols: ["x402"], price: { mode: "fixed", currency: "USD", amount: "0.01" } });
    expect(doc.paths["/api/x402/deployer"].get["x-payment-info"].price.amount).toBe("0.005");
    for (const id of IDS) expect(doc.paths[PAID_ROUTES[id].path].get.responses).toHaveProperty("402");
  });

  it("describes the query parameters each route needs", () => {
    const scan = doc.paths["/api/x402/scan"].get.parameters;
    expect(scan).toContainEqual(expect.objectContaining({ name: "mint", in: "query", required: true }));
    expect(scan).toContainEqual(expect.objectContaining({ name: "chain", in: "query", required: false }));
    expect(doc.paths["/api/x402/agent"].get.parameters).toContainEqual(expect.objectContaining({ name: "address", required: true }));
  });
});

describe("wellKnownX402", () => {
  it("lists the three paid resource URLs", () => {
    expect(wellKnownX402(ORIGIN)).toEqual({ version: 1, resources: IDS.map((id) => `${ORIGIN}${PAID_ROUTES[id].path}`) });
  });
});

describe("output examples match the real response shapes (agents build parsers from them)", () => {
  it("a scan check carries ScanCheck's fields: key, label, status, value, explain", () => {
    const example = bazaarDiscovery("scan").output.example as { checks: Array<Record<string, unknown>> };
    expect(Object.keys(example.checks[0]).sort()).toEqual(["explain", "key", "label", "status", "value"]);
  });
});

describe("bazaarDiscovery — the input schema x402 catalogs need to list a route", () => {
  it("gives every route an example input that satisfies its own schema", () => {
    for (const id of IDS) {
      const d = bazaarDiscovery(id);
      expect(d.inputSchema.type).toBe("object");
      for (const req of d.inputSchema.required) expect(d.input).toHaveProperty(req);
      expect(d.output.example).toBeTruthy();
    }
  });
});
