"use client";

// The real wallet stack, loaded only on demand (see WalletRoot). Wallet Standard wallets — Phantom,
// Solflare, Backpack and the rest — are auto-detected, so no per-wallet adapter packages are
// bundled (the Solflare SDK alone was ~190 KB). On Android the Mobile Wallet Adapter is added by
// WalletProvider itself.

import { useEffect, useMemo, useRef } from "react";
import { ConnectionProvider, WalletProvider, useWallet } from "@solana/wallet-adapter-react";
import { WalletReadyState, type WalletName } from "@solana/wallet-adapter-base";
import { VersionedTransaction } from "@solana/web3.js";
import { SOLANA_RPC } from "./rpc";
import type { WalletOption, WalletState } from "./WalletRoot";

function Bridge({ onState }: { onState: (s: WalletState) => void }) {
  const { wallets, wallet, select, connect, disconnect, connected, connecting, publicKey, signMessage, signTransaction } = useWallet();
  const pending = useRef(false);

  // Bytes in, bytes out, so the light WalletRoot context never needs @solana/web3.js.
  const signTx = useMemo(
    () =>
      signTransaction
        ? async (bytes: Uint8Array) => (await signTransaction(VersionedTransaction.deserialize(bytes))).serialize()
        : null,
    [signTransaction],
  );

  // connect once the chosen wallet is selected
  useEffect(() => {
    if (wallet && pending.current && !connected && !connecting) {
      pending.current = false;
      connect().catch(() => { /* rejected in the wallet, or unavailable */ });
    }
  }, [wallet, connected, connecting, connect]);

  const options = useMemo<WalletOption[]>(
    () =>
      wallets
        .filter((w) => w.readyState !== WalletReadyState.Unsupported)
        .map((w) => ({
          name: w.adapter.name,
          icon: w.adapter.icon,
          url: w.adapter.url,
          detected: w.readyState === WalletReadyState.Installed || w.readyState === WalletReadyState.Loadable,
        })),
    [wallets],
  );

  const address = publicKey ? publicKey.toBase58() : null;
  useEffect(() => {
    onState({
      ready: true,
      connected: connected && !!address,
      connecting,
      address,
      walletIcon: wallet?.adapter.icon ?? null,
      options,
      select: (name: string) => { pending.current = true; select(name as WalletName); },
      disconnect: () => { void disconnect(); },
      signMessage: signMessage ?? null,
      signTransaction: signTx,
    });
  }, [onState, connected, connecting, address, wallet, options, select, disconnect, signMessage, signTx]);

  return null;
}

export default function WalletEngine({ onState }: { onState: (s: WalletState) => void }) {
  return (
    <ConnectionProvider endpoint={SOLANA_RPC}>
      <WalletProvider wallets={[]} autoConnect>
        <Bridge onState={onState} />
      </WalletProvider>
    </ConnectionProvider>
  );
}
