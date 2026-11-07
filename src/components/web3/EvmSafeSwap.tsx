"use client";

import { EVM_SWAP_CHAINS } from "@/lib/actions/safe-swap-gate";
import styles from "@/app/safe-swap/[mint]/safe-swap.module.css";

interface EvmSafeSwapProps {
  chain: string;
  address: string;
  symbol: string;
  feeRecipient?: string;
  feeBps?: number;
}

/**
 * Scan-gated EVM swap links for Base, Ethereum, Arbitrum, BNB Chain, Polygon, Avalanche & Optimism.
 * Plain links out to the aggregators' own apps: GL1TCH builds no transaction and asks for no approval
 * (money-guard.mjs), and takes no fee here. An EVM fee needs a registered integrator (e.g. LI.FI partner
 * portal or a 1inch API key building the swap server-side); until one exists, the page says there is none.
 */
export function EvmSafeSwap({ chain, address, symbol }: EvmSafeSwapProps) {
  const cfg = EVM_SWAP_CHAINS[chain] ?? EVM_SWAP_CHAINS.base;

  const oneInchUrl = `https://app.1inch.io/#/${cfg.chainId}/simple/swap/${cfg.nativeSymbol}/${address}`;
  const odosUrl = `https://app.odos.xyz/?chain=${encodeURIComponent(chain)}&outputCurrency=${address}`;
  const uniswapUrl = `https://app.uniswap.org/swap?chain=${encodeURIComponent(chain === "bsc" ? "bnb" : chain)}&outputCurrency=${address}`;
  const dexscreenerUrl = `https://dexscreener.com/${encodeURIComponent(chain)}/${address}`;

  return (
    <div className={styles.evmCard}>
      <div className={styles.evmHeader}>
        <span className={styles.evmChainBadge}>{cfg.label} · Chain ID {cfg.chainId}</span>
        <span className={styles.evmAddr}>{address.slice(0, 8)}…{address.slice(-6)}</span>
      </div>

      <p className={styles.note} style={{ marginBottom: "1.25rem" }}>
        Pick a router below to swap <strong>{cfg.nativeSymbol} → {symbol}</strong> in its own app, with your own wallet.
        GL1TCH takes no fee on EVM swaps. Check the token address in the router matches the one above before you sign.
      </p>

      <div className={styles.evmActions}>
        <a href={oneInchUrl} target="_blank" rel="noopener noreferrer" className={styles.evmPrimaryBtn}>
          ⚡ Swap {cfg.nativeSymbol} → {symbol} on 1inch ↗
        </a>
        <a href={odosUrl} target="_blank" rel="noopener noreferrer" className={styles.evmSecondaryBtn}>
          🔄 Swap on Odos ({cfg.label}) ↗
        </a>
        <a href={uniswapUrl} target="_blank" rel="noopener noreferrer" className={styles.evmSecondaryBtn}>
          🦄 Open on {cfg.dexName} ↗
        </a>
        <a href={dexscreenerUrl} target="_blank" rel="noopener noreferrer" className={styles.evmSecondaryBtn}>
          📊 Live pool &amp; chart on DexScreener ↗
        </a>
      </div>

      <div className={styles.evmFooter}>
        <span>✓ Scan-gated ({cfg.label})</span>
        <span>•</span>
        <span>✓ No GL1TCH approvals or fee</span>
        <span>•</span>
        <a href={`${cfg.explorer}/token/${address}`} target="_blank" rel="noopener noreferrer" className={styles.link}>
          Contract on explorer ↗
        </a>
      </div>
    </div>
  );
}
