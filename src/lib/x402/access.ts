/** How a request to a paid route is served. Order matters: nobody is asked to pay when the route
 *  can't take payment, when the input is wrong, or when they're over the rate limit; $GL1TCH key
 *  holders get the paid API free (the token's utility). */
export type AccessMode = "unconfigured" | "invalid" | "limited" | "holder" | "paid";

export function accessMode(i: { configured: boolean; inputError: string | null; limited: boolean; holder: boolean }): AccessMode {
  if (!i.configured) return "unconfigured";
  if (i.inputError) return "invalid";
  if (i.limited) return "limited";
  if (i.holder) return "holder";
  return "paid";
}
