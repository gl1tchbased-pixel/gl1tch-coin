import type { SettleLike } from "@/lib/revenue";

type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj | undefined => (v && typeof v === "object" ? (v as Obj) : undefined);
const str = (v: unknown): string | undefined => (typeof v === "string" ? v : undefined);

/** Pull what the revenue ledger needs out of x402's after-settle hook context. The route comes
 *  from the server-side request path when present; the payload's resource URL is client-supplied,
 *  so it is only the fallback. The amount always comes from the server's own requirements. */
export function settleInputFromContext(ctx: unknown): { result: SettleLike; requirementsAmount?: string; resourceUrl?: string } | null {
  const c = obj(ctx);
  const r = obj(c?.result);
  if (!c || !r || typeof r.success !== "boolean") return null;
  const result: SettleLike = { success: r.success };
  if (str(r.transaction)) result.transaction = str(r.transaction);
  if (str(r.network)) result.network = str(r.network);
  if (str(r.amount)) result.amount = str(r.amount);
  if (str(r.payer)) result.payer = str(r.payer);
  const serverPath = str(obj(obj(c.transportContext)?.request)?.path);
  const clientUrl = str(obj(obj(c.paymentPayload)?.resource)?.url);
  return { result, requirementsAmount: str(obj(c.requirements)?.amount), resourceUrl: serverPath ?? clientUrl };
}
