"use client";

import { useEffect, useRef, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletReadyState } from "@solana/wallet-adapter-base";
import { WalletIcon } from "@/components/icons/Glyphs";
import styles from "./ConnectWallet.module.css";

export function ConnectWallet() {
  const {
    wallets,
    select,
    connect,
    disconnect,
    connected,
    connecting,
    publicKey,
    wallet,
  } = useWallet();
  const [modalOpen, setModalOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const pending = useRef(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Connect once a wallet has been selected.
  useEffect(() => {
    if (wallet && pending.current && !connected && !connecting) {
      pending.current = false;
      connect().catch(() => {
        /* user rejected or wallet unavailable */
      });
    }
  }, [wallet, connected, connecting, connect]);

  // Close the connected dropdown on outside click.
  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [menuOpen]);

  // Lock scroll + close modal on Escape.
  useEffect(() => {
    if (!modalOpen) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setModalOpen(false);
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
  }, [modalOpen]);

  const detected = wallets.filter(
    (w) =>
      w.readyState === WalletReadyState.Installed ||
      w.readyState === WalletReadyState.Loadable
  );
  const notDetected = wallets.filter(
    (w) => w.readyState === WalletReadyState.NotDetected
  );

  const choose = (name: Parameters<typeof select>[0]) => {
    pending.current = true;
    select(name);
    setModalOpen(false);
  };

  // --- Connected state: address pill + dropdown ---
  if (connected && publicKey) {
    const addr = publicKey.toBase58();
    const short = `${addr.slice(0, 4)}…${addr.slice(-4)}`;
    return (
      <div className={styles.root} ref={rootRef}>
        <button
          className={`${styles.btn} ${styles.connected}`}
          onClick={() => setMenuOpen((v) => !v)}
          aria-expanded={menuOpen}
        >
          {wallet?.adapter.icon && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={wallet.adapter.icon} alt="" width={16} height={16} />
          )}
          <span className={styles.dot} aria-hidden="true" />
          {short}
        </button>
        {menuOpen && (
          <div className={styles.menu} role="menu">
            <button
              className={styles.menuItem}
              onClick={async () => {
                await navigator.clipboard.writeText(addr);
                setCopied(true);
                setTimeout(() => setCopied(false), 1200);
              }}
            >
              {copied ? "Copied ✓" : "Copy address"}
            </button>
            <a
              className={styles.menuItem}
              href={`https://solscan.io/account/${addr}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              View on Solscan ↗
            </a>
            <button
              className={`${styles.menuItem} ${styles.danger}`}
              onClick={() => {
                disconnect();
                setMenuOpen(false);
              }}
            >
              Disconnect
            </button>
          </div>
        )}
      </div>
    );
  }

  // --- Disconnected state: trigger + modal ---
  return (
    <>
      <button
        className={styles.btn}
        onClick={() => setModalOpen(true)}
        disabled={connecting}
      >
        <WalletIcon size={16} />
        {connecting ? "Connecting…" : "Connect Wallet"}
      </button>

      {modalOpen && (
        <div
          className={styles.overlay}
          role="dialog"
          aria-modal="true"
          aria-label="Connect a wallet"
          onClick={(e) => e.target === e.currentTarget && setModalOpen(false)}
        >
          <div className={styles.modal}>
            <div className={styles.modalHead}>
              <div>
                <span className={styles.modalEyebrow}>Connect</span>
                <h3 className={styles.modalTitle}>Join The Infected</h3>
              </div>
              <button
                className={styles.close}
                aria-label="Close"
                onClick={() => setModalOpen(false)}
              >
                ✕
              </button>
            </div>
            <p className={styles.modalNote}>
              Self-custody — we only read your balance to resolve your rank. We never
              move funds.
            </p>

            <div className={styles.list}>
              {detected.length === 0 && notDetected.length === 0 && (
                <span className={styles.empty}>
                  No Solana wallet found. Install one below.
                </span>
              )}
              {detected.map((w) => (
                <button
                  key={w.adapter.name}
                  className={styles.option}
                  onClick={() => choose(w.adapter.name)}
                >
                  {w.adapter.icon && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={w.adapter.icon} alt="" width={28} height={28} />
                  )}
                  <span className={styles.optionName}>{w.adapter.name}</span>
                  <span className={styles.badge}>Detected</span>
                </button>
              ))}
              {notDetected.map((w) => (
                <a
                  key={w.adapter.name}
                  className={`${styles.option} ${styles.optionInstall}`}
                  href={w.adapter.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {w.adapter.icon && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={w.adapter.icon} alt="" width={28} height={28} />
                  )}
                  <span className={styles.optionName}>{w.adapter.name}</span>
                  <span className={styles.install}>Install ↗</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
