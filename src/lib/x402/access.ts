/** How a request to a paid route is served. Order matters: nobody is asked to pay when the route
 *  can't take payment or when they're over the rate limit; $GL1TCH key holders get the paid API
 *  free (the token's utility). Input validity never enters here: x402 discovery probes call
 *  without parameters and must still get the 402 challenge. The handler validates input itself,
 *  and a 400 is never settled, so bad input still costs nothing. */
export type AccessMode = "unconfigured" | "limited" | "holder" | "paid";

export function accessMode(i: { configured: boolean; limited: boolean; holder: boolean }): AccessMode {
  if (!i.configured) return "unconfigured";
  if (i.limited) return "limited";
  if (i.holder) return "holder";
  return "paid";
}
