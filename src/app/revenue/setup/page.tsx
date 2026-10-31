"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Connection,
  PublicKey,
  Transaction,
  ComputeBudgetProgram,
} from "@solana/web3.js";
import {
  buildInitializeReferralAccountWithNameIx,
  buildInitializeReferralTokenAccountIx,
  getReferralAccountPda,
  DEFAULT_REFERRAL_NAME,
  WSOL_MINT,
  USDC_MINT,
  type ReferralStatus,
} from "@/lib/jupiter/referral";
import { SOLANA_RPC } from "@/lib/wallet/rpc";
import styles from "./setup.module.css";

const DEPLOYER_TARGET = "H5qbtquJzLVrwYj5opedoQCy9edQQZAtiyPMTMFFaFb4";

interface PhantomProvider {
  isPhantom?: boolean;
  publicKey: { toBase58: () => string };
  connect: (opts?: { onlyIfTrusted?: boolean }) => Promise<{ publicKey: { toBase58: () => string } }>;
  signTransaction: (tx: Transaction) => Promise<Transaction>;
  signAndSendTransaction?: (tx: Transaction) => Promise<{ signature: string }>;
}

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

  const getProvider = (): PhantomProvider | null => {
    if (typeof window !== "undefined") {
      const win = window as unknown as { solana?: PhantomProvider; phantom?: { solana?: PhantomProvider } };
      return win.phantom?.solana || win.solana || null;
    }
    return null;
  };

  const checkWallet = useCallback(async () => {
    const provider = getProvider();
    if (provider) {
      try {
        const resp = await provider.connect({ onlyIfTrusted: true });
        if (resp?.publicKey) {
          const addr = resp.publicKey.toBase58();
          setWalletAddress(addr);
          fetchBalance(addr);
        }
      } catch {
        // Not auto-connected
      }
    }
  }, []);

  const fetchBalance = async (addr: string) => {
    try {
      const conn = new Connection(SOLANA_RPC || "https://solana-rpc.publicnode.com", "confirmed");
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
    const provider = getProvider();
    if (!provider) {
      setError("Phantom cüzdanı bulunamadı. Lütfen tarayıcınızda Phantom eklentisini açın.");
      return;
    }
    try {
      const resp = await provider.connect();
      const addr = resp.publicKey.toBase58();
      setWalletAddress(addr);
      await fetchBalance(addr);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Cüzdan bağlantısı reddedildi.");
    }
  };

  const executeSetup = async (includeVaults: boolean) => {
    setError(null);
    setTxSig(null);
    setLoading(true);

    const provider = getProvider();
    if (!provider || !provider.publicKey) {
      setError("Cüzdan bağlı değil. Lütfen önce Phantom'u bağlayın.");
      setLoading(false);
      return;
    }

    try {
      setStepMsg("Solana ağına bağlanılıyor ve işlem hazırlanıyor...");
      const conn = new Connection(SOLANA_RPC || "https://solana-rpc.publicnode.com", "confirmed");
      const payer = new PublicKey(provider.publicKey.toBase58());

      // 1. Fetch fresh blockhash directly
      const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash("confirmed");

      // 2. Build transaction in memory
      const tx = new Transaction();
      tx.recentBlockhash = blockhash;
      tx.feePayer = payer;

      // Priority fee: 50,000 microLamports (~0.00001 SOL)
      tx.add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 50000 }));

      const [referralPda] = getReferralAccountPda(DEFAULT_REFERRAL_NAME);

      // Base account
      tx.add(
        buildInitializeReferralAccountWithNameIx({
          payer,
          name: DEFAULT_REFERRAL_NAME,
        })
      );

      // Token vaults if requested
      if (includeVaults) {
        tx.add(
          buildInitializeReferralTokenAccountIx({
            payer,
            referralAccount: referralPda,
            mint: WSOL_MINT,
          })
        );
        tx.add(
          buildInitializeReferralTokenAccountIx({
            payer,
            referralAccount: referralPda,
            mint: USDC_MINT,
          })
        );
      }

      setStepMsg("Lütfen Phantom cüzdanınızdan gelen ONAY (Approve) penceresini kabul edin...");

      // 3. Sign transaction
      let signedTx: Transaction;
      try {
        signedTx = await provider.signTransaction(tx);
      } catch (signErr: unknown) {
        const msg = signErr instanceof Error ? signErr.message : String(signErr);
        if (msg.includes("reject") || msg.includes("User rejected")) {
          throw new Error("İşlem Phantom cüzdanından iptal edildi.");
        }
        throw new Error(`Phantom imzalama hatası: ${msg}`);
      }

      setStepMsg("İmza alındı! İşlem Solana blokzincirine yayınlanıyor...");

      // 4. Broadcast raw transaction to Solana RPC
      const rawTx = signedTx.serialize();
      const signature = await conn.sendRawTransaction(rawTx, {
        skipPreflight: false,
        preflightCommitment: "confirmed",
        maxRetries: 3,
      });

      setStepMsg(`Solana ağında onay bekleniyor... (Tx: ${signature.slice(0, 10)}…)`);

      // 5. Confirm
      const confirmation = await conn.confirmTransaction(
        {
          signature,
          blockhash,
          lastValidBlockHeight,
        },
        "confirmed"
      );

      if (confirmation.value.err) {
        throw new Error(`Solana işlem hatası: ${JSON.stringify(confirmation.value.err)}`);
      }

      setTxSig(signature);
      setStepMsg("🎉 BAŞARILI! Jupiter Referral hesabı ve kasa hesapları Solana blokzincirinde aktif edildi!");
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
          GL1TCH Safe Swap alım-satımlarından protokol hazinesine %0.5 işlem komisyonu (50 bps) akması için Jupiter Referral hesabınızı tek tıkla onaylayın.
        </p>
      </header>

      <section className={styles.card}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>1. Cüzdan &amp; Hesap Durumu</h2>
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

        <div style={{ marginTop: "2rem", display: "flex", flexDirection: "column", gap: "10px" }}>
          {!walletAddress ? (
            <button className={styles.connectBtn} onClick={handleConnect}>
              🦊 Phantom Cüzdanını Bağla
            </button>
          ) : status?.ready ? (
            <button className={styles.primaryBtn} disabled>
              ✅ Referral ve Komisyon Kasaları Zaten Aktif!
            </button>
          ) : (
            <>
              <button
                className={styles.primaryBtn}
                onClick={() => executeSetup(true)}
                disabled={loading}
              >
                {loading ? "Onay Bekleniyor..." : "🚀 Phantom ile Tek Tıkla Onayla (Tüm Kasalar)"}
              </button>
              <button
                style={{
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  color: "#cbd5e1",
                  padding: "0.75rem",
                  borderRadius: "10px",
                  fontSize: "0.9rem",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
                onClick={() => executeSetup(false)}
                disabled={loading}
              >
                ⚡ Sadece Ana Referral Hesabını Başlat (Alternatif)
              </button>
            </>
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
            ← Gelir &amp; Hazine Sayfasına Dön
          </Link>
        </div>
      </section>
    </main>
  );
}
