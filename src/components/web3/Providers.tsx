"use client";

import { useMemo } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from "@solana/wallet-adapter-wallets";

// Browser-safe fallback: the canonical api.mainnet-beta.solana.com endpoint
// blocks cross-origin browser requests (CORS), which silently breaks in-page
// balance reads. publicnode is a free, key-less, CORS-enabled mainnet RPC, so
// rank checking works even when NEXT_PUBLIC_SOLANA_RPC is unset or empty.
const FALLBACK_RPC = "https://solana-rpc.publicnode.com";

export function Web3Providers({ children }: { children: React.ReactNode }) {
  const endpoint = useMemo(() => {
    const env = process.env.NEXT_PUBLIC_SOLANA_RPC?.trim();
    return env && /^https?:\/\//.test(env) ? env : FALLBACK_RPC;
  }, []);

  // Backpack and other Wallet-Standard wallets are auto-detected; these
  // explicit adapters guarantee Phantom/Solflare appear even if not injected.
  const wallets = useMemo(
    () => [new PhantomWalletAdapter(), new SolflareWalletAdapter()],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        {children}
      </WalletProvider>
    </ConnectionProvider>
  );
}
