export interface AcpService {
  serviceId: string;
  name: string;
  description: string;
  pricingUsdc: number;
  schema: Record<string, unknown>;
}

export interface AcpJob {
  jobId: string;
  serviceId: string;
  input: Record<string, unknown>;
  buyerAddress?: string;
  maxEscrowUsdc?: number;
}

export interface AcpExecutionResult {
  jobId: string;
  serviceId: string;
  status: "COMPLETED" | "FAILED";
  deliverable: unknown;
  escrowSettlement: {
    amountUsdc: number;
    recipient: string;
    network: string;
  };
  metadata: {
    worker: string;
    completedAt: number;
    durationMs: number;
    standardsCompliant: string;
  };
}

export interface Gl1tchAcpWorkerOptions {
  gl1tchApiUrl?: string;
  treasuryAddress?: string;
  apiKey?: string;
  fetch?: typeof fetch;
}

export class Gl1tchAcpWorker {
  constructor(opts?: Gl1tchAcpWorkerOptions);
  getProfile(): Record<string, unknown>;
  executeJob(job: AcpJob): Promise<AcpExecutionResult>;
}

