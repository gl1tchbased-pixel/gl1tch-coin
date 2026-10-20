"use client";

import { useEffect, useRef, useState } from "react";
import { WalletIcon } from "@/components/icons/Glyphs";
import { useWalletApi } from "@/lib/wallet/WalletRoot";
import styles from "./ConnectWallet.module.css";

// Shown when no Wallet Standard wallet is detected in this browser.
const INSTALL = [
  { name: "Phantom", url: "https://phantom.app/download" },
  { name: "Solflare", url: "https://solflare.com/download" },
  { name: "Backpack", url: "https://backpack.app/downloads" },
];

export function ConnectWallet() {
  const { load, ready, options, select, disconnect, connected, connecting, address, walletIcon } = useWalletApi();
  const [modalOpen, setModalOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

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

  const detected = options.filter((w) => w.detected);
  const notDetected = options.filter((w) => !w.detected);

  const choose = (name: string) => {
    select(name);
    setModalOpen(false);
  };

  // --- Connected state: address pill + dropdown ---
  if (connected && address) {
    const addr = address;
    const short = `${addr.slice(0, 4)}…${addr.slice(-4)}`;
    return (
      <div className={styles.root} ref={rootRef}>
        <button
          className={`${styles.btn} ${styles.connected}`}
          onClick={() => setMenuOpen((v) => !v)}
          aria-expanded={menuOpen}
        >
          {walletIcon && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={walletIcon} alt="" width={16} height={16} />
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
        // the wallet stack loads on this first click, not with the page
        onPointerEnter={load}
        onFocus={load}
        onClick={() => { load(); setModalOpen(true); }}
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
              {!ready && <span className={styles.empty}>Looking for wallets…</span>}
              {ready && detected.length === 0 && (
                <span className={styles.empty}>
                  No Solana wallet found in this browser. Install one below.
                </span>
              )}
              {detected.map((w) => (
                <button
                  key={w.name}
                  className={styles.option}
                  onClick={() => choose(w.name)}
                >
                  {w.icon && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={w.icon} alt="" width={28} height={28} />
                  )}
                  <span className={styles.optionName}>{w.name}</span>
                  <span className={styles.badge}>Detected</span>
                </button>
              ))}
              {notDetected.map((w) => (
                <a
                  key={w.name}
                  className={`${styles.option} ${styles.optionInstall}`}
                  href={w.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {w.icon && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={w.icon} alt="" width={28} height={28} />
                  )}
                  <span className={styles.optionName}>{w.name}</span>
                  <span className={styles.install}>Install ↗</span>
                </a>
              ))}
              {ready && detected.length === 0 &&
                INSTALL.filter((i) => !notDetected.some((w) => w.name === i.name)).map((i) => (
                  <a
                    key={i.name}
                    className={`${styles.option} ${styles.optionInstall}`}
                    href={i.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <span className={styles.optionName}>{i.name}</span>
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
