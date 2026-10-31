"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import { SOLANA_RPC } from "@/lib/wallet/rpc";
import styles from "./setup.module.css";

interface ReferralStatus {
  name: string;
  referralPda: string;
  referralInitialized: boolean;
  wsolAtaPda: string;
  wsolInitialized: boolean;
  usdcAtaPda: string;
  usdcInitialized: boolean;
  ready: boolean;
}

const DEPLOYER_TARGET = "H5qbtquJzLVrwYj5opedoQCy9edQQZAtiyPMTMFFaFb4";

export default function ReferralSetupPage() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [status, setStatus] = useState<ReferralStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(true);
  const [txSig, setTxSig] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stepMsg, setStepMsg] = useState<string>("");
  const [copied, setCopied] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      setStatusLoading(true);
      const res = await fetch("/api/admin/referral-status");
      const data = await res.json();
      if (data.ok) {
        setStatus(data.status);
      }
    } catch {
      /* ignore */
    } finally {
      setStatusLoading(false);
    }
  }, []);

  const checkWallet = useCallback(async () => {
    // Check window.solana (Phantom)
    if (typeof window !== "undefined" && (window as unknown as { solana?: { isPhantom?: boolean; publicKey?: { toBase58: () => string } } }).solana) {
      const solana = (window as unknown as { solana: { isPhantom?: boolean; publicKey?: { toBase58: () => string }; connect: (opts?: { onlyIfTrusted?: boolean }) => Promise<{ publicKey: { toBase58: () => string } }> } }).solana;
      try {
        const resp = await solana.connect({ onlyIfTrusted: true });
        if (resp?.publicKey) {
          const addr = resp.publicKey.toBase58();
          setWalletAddress(addr);
          fetchBalance(addr);
        }
      } catch {
        // Not auto-connected yet
      }
    }
  }, []);

  const fetchBalance = async (addr: string) => {
    try {
      const conn = new Connection(SOLANA_RPC || "https://api.mainnet-beta.solana.com", "confirmed");
      const bal = await conn.getBalance(new PublicKey(addr));
      setBalance(bal / 1e9);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    fetchStatus();
    checkWallet();
  }, [fetchStatus, checkWallet]);

  const handleConnect = async () => {
    setError(null);
    if (typeof window === "undefined" || !(window as unknown as { solana?: unknown }).solana) {
      setError("Phantom cüzdanı bulunamadı. Lütfen Phantom eklentisini açın.");
      return;
    }
    const solana = (window as unknown as { solana: { connect: () => Promise<{ publicKey: { toBase58: () => string } }> } }).solana;
    try {
      const resp = await solana.connect();
      const addr = resp.publicKey.toBase58();
      setWalletAddress(addr);
      await fetchBalance(addr);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Cüzdan bağlantısı reddedildi.");
    }
  };

  const handleInitialize = async () => {
    if (!walletAddress) {
      await handleConnect();
      return;
    }

    setError(null);
    setTxSig(null);
    setLoading(true);
    setStepMsg("Hazırlanıyor: Jupiter Referral işlem verisi alınıyor...");

    try {
      // 1. Fetch serialized transaction from API
      const res = await fetch("/api/actions/init-referral", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account: walletAddress }),
      });

      const data = await res.json();
      if (!res.ok || !data.transaction) {
        throw new Error(data.error || "İşlem oluşturulamadı.");
      }

      setStepMsg("Lütfen Phantom cüzdanınızdan gelen işlemi ONAYLAYIN (Approve)...");

      // 2. Deserialize transaction
      const rawTx = Buffer.from(data.transaction, "base64");
      const tx = Transaction.from(rawTx);

      // 3. Prompt user's Phantom
      const solana = (window as unknown as {
        solana: {
          signAndSendTransaction: (
            tx: Transaction
          ) => Promise<{ signature: string }>;
        };
      }).solana;

      const { signature } = await solana.signAndSendTransaction(tx);
      setStepMsg(`İşlem iletildi! Solana ağında onaylanıyor (Sig: ${signature.slice(0, 8)}…)...`);

      // 4. Confirm on Solana
      const conn = new Connection(SOLANA_RPC || "https://api.mainnet-beta.solana.com", "confirmed");
      const latestBlockhash = await conn.getLatestBlockhash("confirmed");
      await conn.confirmTransaction({
        signature,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      }, "confirmed");

      setTxSig(signature);
      setStepMsg("✅ Harika! Jupiter Referral hesabı ve kasa hesapları başarıyla oluşturuldu.");
      await fetchStatus();
      if (walletAddress) await fetchBalance(walletAddress);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      setStepMsg("");
    } finally {
      setLoading(false);
    }
  };

  const blinkUrl = "https://dial.to/?action=solana-action:https://gl1tchbased.xyz/api/actions/init-referral";

  const copyBlink = () => {
    navigator.clipboard.writeText(blinkUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <main className={styles.container}>
      <header className={styles.hero}>
        <div className={styles.badge}>⚡ Protocol Treasury Setup</div>
        <h1 className={styles.title}>
          Jupiter Referral <span className={styles.accent}>Aktivasyonu</span>
        </h1>
        <p className={styles.subtitle}>
          GL1TCH Safe Swap işlemlerinden protokol hazinesine %0.5 işlem komisyonu (50 bps) akması için Jupiter Referral hesabınızı tek tıkla başlatın.
        </p>
      </header>

      <section className={styles.card}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>1. Cüzdan & Hesap Durumu</h2>
          {walletAddress === DEPLOYER_TARGET && (
            <span className={styles.checkStatusReady}>Yetkili Deployer Cüzdanı</span>
          )}
        </div>

        <div className={styles.walletInfo}>
          <div className={styles.infoBox}>
            <div className={styles.infoLabel}>Bağlı Cüzdan</div>
            <div className={styles.infoValue}>
              {walletAddress ? `${walletAddress.slice(0, 6)}…${walletAddress.slice(-6)}` : "Bağlı Değil"}
            </div>
          </div>
          <div className={styles.infoBox}>
            <div className={styles.infoLabel}>Cüzdan Bakiyesi</div>
            <div className={`${styles.infoValue} ${styles.infoValueHighlight}`}>
              {balance !== null ? `${balance.toFixed(4)} SOL` : "—"}
            </div>
          </div>
          <div className={styles.infoBox}>
            <div className={styles.infoLabel}>Hedef Referral PDA</div>
            <div className={styles.infoValue}>
              {status?.referralPda ? `${status.referralPda.slice(0, 6)}…${status.referralPda.slice(-6)}` : "EFP5…hpS2"}
            </div>
          </div>
        </div>

        <div className={styles.checklist}>
          <div className={styles.checkItem}>
            <span className={styles.checkName}>Ana Referral Hesabı (GL1TCH PDA)</span>
            <span className={status?.referralInitialized ? styles.checkStatusReady : styles.checkStatusMissing}>
              {statusLoading ? "Kontrol ediliyor..." : status?.referralInitialized ? "Aktif & Hazır" : "Başlatılmadı"}
            </span>
          </div>
          <div className={styles.checkItem}>
            <span className={styles.checkName}>WSOL Komisyon Kasası (Solana Alım-Satım)</span>
            <span className={status?.wsolInitialized ? styles.checkStatusReady : styles.checkStatusMissing}>
              {statusLoading ? "Kontrol ediliyor..." : status?.wsolInitialized ? "Aktif & Hazır" : "Başlatılmadı"}
            </span>
          </div>
          <div className={styles.checkItem}>
            <span className={styles.checkName}>USDC Komisyon Kasası (Sabit Coin)</span>
            <span className={status?.usdcInitialized ? styles.checkStatusReady : styles.checkStatusMissing}>
              {statusLoading ? "Kontrol ediliyor..." : status?.usdcInitialized ? "Aktif & Hazır" : "Başlatılmadı"}
            </span>
          </div>
        </div>

        {error && <div className={styles.alertError}>❌ {error}</div>}
        {stepMsg && <div className={styles.alertSuccess}>{stepMsg}</div>}

        {txSig && (
          <div className={styles.alertSuccess}>
            🎉 <strong>İşlem Başarılı!</strong><br />
            Solscan:&nbsp;
            <a
              href={`https://solscan.io/tx/${txSig}`}
              target="_blank"
              rel="noreferrer"
              style={{ color: "#7cf6c8", textDecoration: "underline" }}
            >
              solscan.io/tx/{txSig.slice(0, 16)}…
            </a>
          </div>
        )}

        <div style={{ marginTop: "2rem" }}>
          {!walletAddress ? (
            <button className={styles.connectBtn} onClick={handleConnect}>
              🦊 Phantom Cüzdanını Bağla
            </button>
          ) : status?.ready ? (
            <button className={styles.primaryBtn} disabled>
              ✅ Referral ve Komisyon Kasaları Zaten Aktif!
            </button>
          ) : (
            <button
              className={styles.primaryBtn}
              onClick={handleInitialize}
              disabled={loading}
            >
              {loading ? "Onay Bekleniyor..." : "🚀 Phantom ile Tek Tıkla Onayla"}
            </button>
          )}
        </div>

        <div className={styles.blinkBox}>
          <div className={styles.blinkTitle}>Alternatif: Dialect / Phantom Blinks ile Aç</div>
          <div className={styles.blinkDesc}>
            Dilerseniz aşağıdaki bağlantıyı Dialect veya Blink destekleyen tarayıcınızda açıp doğrudan onaylayabilirsiniz:
          </div>
          <div className={styles.linkRow}>
            <input className={styles.linkInput} readOnly value={blinkUrl} />
            <button className={styles.copyBtn} onClick={copyBlink}>
              {copied ? "Kopyalandı!" : "Kopyala"}
            </button>
            <a
              href={blinkUrl}
              target="_blank"
              rel="noreferrer"
              className={styles.copyBtn}
              style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }}
            >
              Aç ↗
            </a>
          </div>
        </div>

        <div style={{ marginTop: "1.5rem", textAlign: "center" }}>
          <Link href="/revenue" style={{ color: "#94a3b8", fontSize: "0.9rem" }}>
            ← Gelir & Hazine Sayfasına Dön
          </Link>
        </div>
      </section>
    </main>
  );
}

