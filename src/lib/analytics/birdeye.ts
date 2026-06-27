/** Optional holder count via Birdeye. Requires BIRDEYE_API_KEY (server-side only).
 *  Returns null when the key is absent or the call fails — never throws. */
export async function fetchBirdeyeHolders(mint: string): Promise<number | null> {
  const key = process.env.BIRDEYE_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch(
      `https://public-api.birdeye.so/defi/token_overview?address=${mint}`,
      {
        next: { revalidate: 60 },
        headers: { "X-API-KEY": key, "x-chain": "solana", accept: "application/json" },
      }
    );
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: { holder?: number } };
    const holders = json?.data?.holder;
    return typeof holders === "number" && Number.isFinite(holders) ? holders : null;
  } catch {
    return null;
  }
}
