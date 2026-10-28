import type { SettleLike } from "@/lib/revenue";

type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj | undefined => (v && typeof v === "object" ? (v as Obj) : undefined);
const str = (v: unknown): string | undefined => (typeof v === "string" ? v : undefined);

/** Header our own test client (scripts/x402-first-call.mjs) sends. Honouring it is safe: all it
 *  can do is keep the sender's own payment out of the revenue total. */
export const SELF_TEST_HEADER = "x-gl1tch-self-test";

/** Pull what the revenue ledger needs out of x402's after-settle hook context. The route comes
 *  from the server-side request path when present; the payload's resource URL is client-supplied,
 *  so it is only the fallback. The amount comes from the settlement, else the server's own
 *  requirements (see revenueEntryFromSettle). */
export function settleInputFromContext(
  ctx: unknown
): { result: SettleLike; requirementsAmount?: string; resourceUrl?: string; selfTest: boolean } | null {
  const c = obj(ctx);
  const r = obj(c?.result);
  if (!c || !r || typeof r.success !== "boolean") return null;
  const result: SettleLike = { success: r.success };
  if (str(r.transaction)) result.transaction = str(r.transaction);
  if (str(r.network)) result.network = str(r.network);
  if (str(r.amount)) result.amount = str(r.amount);
  if (str(r.payer)) result.payer = str(r.payer);
  const request = obj(obj(c.transportContext)?.request);
  const serverPath = str(request?.path);
  const clientUrl = str(obj(obj(c.paymentPayload)?.resource)?.url);
  const adapter = obj(request?.adapter);
  const getHeader = typeof adapter?.getHeader === "function" ? (adapter.getHeader as (n: string) => unknown).bind(adapter) : null;
  const selfTest = getHeader?.(SELF_TEST_HEADER) === "1";
  return { result, requirementsAmount: str(obj(c.requirements)?.amount), resourceUrl: serverPath ?? clientUrl, selfTest };
}
