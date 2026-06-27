import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import {
  createMetadataAccountV3,
  mplTokenMetadata,
} from "@metaplex-foundation/mpl-token-metadata";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { createSignerFromKeypair, none, signerIdentity } from "@metaplex-foundation/umi";
import { base58 } from "@metaplex-foundation/umi/serializers";
import {
  fromWeb3JsKeypair,
  fromWeb3JsPublicKey,
} from "@metaplex-foundation/umi-web3js-adapters";

export interface MetadataArgs {
  name: string;
  symbol: string;
  /** URL of the hosted metadata JSON (Arweave/IPFS). See metadata.md. */
  uri: string;
  /** When false, update authority is dropped so metadata can never change. */
  isMutable: boolean;
}

/**
 * Attach Metaplex Token Metadata to an EXISTING SPL mint (Path B / self-managed).
 * Must run BEFORE authorities are revoked — the current mint authority signs.
 *
 * On the Pump.fun launch path this is unnecessary (metadata is set in the UI).
 */
export async function createTokenMetadata(
  connection: Connection,
  payer: Keypair,
  mint: PublicKey,
  args: MetadataArgs
): Promise<string> {
  const umi = createUmi(connection.rpcEndpoint).use(mplTokenMetadata());
  const signer = createSignerFromKeypair(umi, fromWeb3JsKeypair(payer));
  umi.use(signerIdentity(signer));

  const builder = createMetadataAccountV3(umi, {
    mint: fromWeb3JsPublicKey(mint),
    mintAuthority: signer,
    payer: signer,
    updateAuthority: signer.publicKey,
    data: {
      name: args.name,
      symbol: args.symbol,
      uri: args.uri,
      sellerFeeBasisPoints: 0, // not an NFT — no royalties
      creators: none(),
      collection: none(),
      uses: none(),
    },
    isMutable: args.isMutable,
    collectionDetails: none(),
  });

  const { signature } = await builder.sendAndConfirm(umi);
  // Umi returns the signature as bytes; encode to the usual base58 string.
  return base58.deserialize(signature)[0];
}
