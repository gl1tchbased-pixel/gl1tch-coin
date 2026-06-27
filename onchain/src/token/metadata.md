# Token Metadata Runbook

A token needs Metaplex metadata (name, symbol, image, description) to display
correctly in wallets and explorers.

## Steps
1. Host the token image (PNG/SVG) and a metadata JSON on a permanent store
   (Arweave or IPFS/Pinata). The JSON should look like:
   ```json
   {
     "name": "GL1TCH",
     "symbol": "GL1TCH",
     "description": "Infect the internet. A Solana-native rogue-AI cult brand.",
     "image": "https://.../gl1tch.png"
   }
   ```
2. Set `METADATA_URI` in `.env` to the hosted JSON URL.
3. The metadata account is created by `src/token/metadata.ts` (Metaplex Token
   Metadata via Umi), wired into `scripts/path-b-launch.ts`. It runs BEFORE
   authorities are revoked (the mint authority signs). On the Pump.fun path,
   metadata is set in the Pump.fun UI at creation — no script needed.
4. `IMMUTABLE_METADATA=true` (default) drops the update authority for maximum
   trust. Set it to `false` only if you have a concrete reason to keep it mutable.

> The Metaplex SDK (`@metaplex-foundation/mpl-token-metadata` + `umi`) is bundled
> in this workspace and used only on the self-managed (Path B) mint.
