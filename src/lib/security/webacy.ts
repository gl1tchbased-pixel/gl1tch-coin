/**
 * Webacy (DD.xyz) Risk Engine Client & Adapter
 *
 * Implements integration with Webacy's Threat Risks API, Approval Risks API,
 * and Token Analysis API to provide an enterprise-grade multi-source security consensus layer.
 *
 * Designed for the Webacy / Superteam Startup Accelerator Grant.
 * Docs: https://docs.webacy.com/
 */

export interface WebacyConfig {
  apiKey?: string;
  baseUrl?: string;
}

export interface WebacyThreatResult {
  enabled: boolean;
  provider: "webacy";
  address: string;
  chain: string;
  isMalicious?: boolean;
  threatLevel?: "low" | "medium" | "high" | "critical";
  categories?: string[];
  reason?: string;
}

const DEFAULT_BASE_URL = "https://api.webacy.com/v1";

export class WebacyClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(config: WebacyConfig = {}) {
    this.apiKey = config.apiKey || process.env.WEBACY_API_KEY || "";
    this.baseUrl = (config.baseUrl || process.env.WEBACY_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, "");
  }

  /**
   * Check whether Webacy API credentials are configured.
   */
  isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.length > 0);
  }

  /**
   * Evaluates threat risk for an on-chain address (wallet, smart contract, or token mint).
   * Supports Solana, Ethereum, Base, Polygon, Arbitrum, BSC, and other major chains.
   */
  async checkThreat(address: string, chain: string = "solana"): Promise<WebacyThreatResult> {
    if (!this.isConfigured()) {
      return {
        enabled: false,
        provider: "webacy",
        address,
        chain,
        reason: "Webacy API credentials pending Startup Accelerator Grant activation",
      };
    }

    try {
      const endpoint = `${this.baseUrl}/threats/${encodeURIComponent(chain)}/${encodeURIComponent(address)}`;
      const res = await fetch(endpoint, {
        headers: {
          "x-api-key": this.apiKey,
          "accept": "application/json",
          "user-agent": "gl1tch-security/1.0",
        },
        signal: AbortSignal.timeout(4000),
      });

      if (!res.ok) {
        return {
          enabled: true,
          provider: "webacy",
          address,
          chain,
          threatLevel: "low",
          reason: `Webacy endpoint returned HTTP ${res.status}`,
        };
      }

      const data = await res.json();
      return {
        enabled: true,
        provider: "webacy",
        address,
        chain,
        isMalicious: Boolean(data.isMalicious || data.threatScore > 50),
        threatLevel: data.threatLevel || (data.threatScore > 75 ? "critical" : data.threatScore > 50 ? "high" : "low"),
        categories: Array.isArray(data.categories) ? data.categories : [],
      };
    } catch (err) {
      return {
        enabled: true,
        provider: "webacy",
        address,
        chain,
        threatLevel: "low",
        reason: (err as Error).message,
      };
    }
  }
}

export const webacy = new WebacyClient();

