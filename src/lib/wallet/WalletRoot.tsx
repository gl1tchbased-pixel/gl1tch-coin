"use client";

// The wallet stack (wallet-adapter + @solana/web3.js) is the heaviest JS on the site, and most
// visitors never connect a wallet. WalletRoot holds the wallet state in a small context with no
// Solana code; the real stack lives in WalletEngine, loaded on demand and rendered as a SIBLING of
// the page (never a parent), so loading it later never remounts anything.
//
// The engine loads when:
//  - someone opens the Connect menu or a wallet-gated tool (useWalletApi().load()), or
//  - a returning visitor has a remembered wallet (auto-connect), once the page is idle.

import dynamic from "next/dynamic";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export interface WalletOption { name: string; icon: string; url: string; detected: boolean }

export interface WalletState {
  /** The engine has loaded and reported at least once. */
  ready: boolean;
  connected: boolean;
  connecting: boolean;
  /** Base58 address of the connected wallet. */
  address: string | null;
  walletIcon: string | null;
  options: WalletOption[];
  select: (name: string) => void;
  disconnect: () => void;
  /** Present only when the connected wallet can sign messages. */
  signMessage: ((message: Uint8Array) => Promise<Uint8Array>) | null;
  /** Signs a serialized versioned transaction and returns it serialized; null when the wallet can't. */
  signTransaction: ((tx: Uint8Array) => Promise<Uint8Array>) | null;
}

export interface WalletApi extends WalletState {
  /** Ask for the wallet stack (idempotent). */
  load: () => void;
}

const IDLE: WalletState = {
  ready: false,
  connected: false,
  connecting: false,
  address: null,
  walletIcon: null,
  options: [],
  select: () => {},
  disconnect: () => {},
  signMessage: null,
  signTransaction: null,
};

const Ctx = createContext<WalletApi>({ ...IDLE, load: () => {} });

// wallet-adapter remembers the last wallet under this key; it's how autoConnect knows to reconnect.
const REMEMBERED = "walletName";

const WalletEngine = dynamic(() => import("./WalletEngine"), { ssr: false });

export function WalletRoot({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<WalletState>(IDLE);
  const [wanted, setWanted] = useState(false);
  const load = useCallback(() => setWanted(true), []);

  useEffect(() => {
    let remembered = false;
    try { remembered = !!window.localStorage.getItem(REMEMBERED); } catch { /* storage blocked */ }
    if (!remembered) return;
    // returning wallet user: reconnect quietly, in the first idle moment (at most 1.5 s in)
    const go = () => setWanted(true);
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(go, { timeout: 1500 });
      return () => window.cancelIdleCallback(id);
    }
    const t = setTimeout(go, 800);
    return () => clearTimeout(t);
  }, []);

  const api = useMemo<WalletApi>(() => ({ ...state, load }), [state, load]);
  return (
    <Ctx.Provider value={api}>
      {children}
      {wanted && <WalletEngine onState={setState} />}
    </Ctx.Provider>
  );
}

/** Wallet state for any component. Call `load()` before relying on it (cheap, idempotent). */
export const useWalletApi = () => useContext(Ctx);

/** For wallet-gated tools: loads the stack as soon as the component mounts. */
export function useWalletEager(): WalletApi {
  const api = useWalletApi();
  const { load } = api;
  useEffect(() => { load(); }, [load]);
  return api;
}
