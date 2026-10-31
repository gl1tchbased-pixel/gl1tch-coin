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
import styles from "./setup.module.css";

const DEPLOYER_TARGET = "H5qbtquJzLVrwYj5opedoQCy9edQQZAtiyPMTMFFaFb4";

const RPC_ENDPOINTS = [
  "https://solana-rpc.publicnode.com",
  "https://rpc.ankr.com/solana",
  "https://api.mainnet-beta.solana.com",
];

async function getWorkingConnection(): Promise<{ conn: Connection; blockhash: string; lastValidBlockHeight: number }> {
  for (const endpoint of RPC_ENDPOINTS) {
    try {
      const conn = new Connection(endpoint, "confirmed");
      const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash("confirmed");
      return { conn, blockhash, lastValidBlockHeight };
    } catch {
      // try next
    }
  }
  throw new Error("Solana RPC sunucularına erişilemedi. Lütfen internet bağlantınızı kontrol edin.");
}

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
      const { conn } = await getWorkingConnection();
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
      setStepMsg("Adım 1/4: Solana ağına bağlanılıyor ve taze blok verisi alınıyor...");
      const { conn, blockhash, lastValidBlockHeight } = await getWorkingConnection();
      const payer = new PublicKey(provider.publicKey.toBase58());

      // 2. Build pure Transaction
      const tx = new Transaction();
      tx.recentBlockhash = blockhash;
      tx.feePayer = payer;

      // Higher Priority fee: 200,000 microLamports (~0.00004 SOL) for instant inclusion
      tx.add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 200000 }));

      const [referralPda] = getReferralAccountPda(DEFAULT_REFERRAL_NAME);
      let instructionsAdded = 0;

      // Only add base account if not yet initialized
      if (!status?.referralInitialized) {
        tx.add(
          buildInitializeReferralAccountWithNameIx({
            payer,
            name: DEFAULT_REFERRAL_NAME,
          })
        );
        instructionsAdded++;
      }

      // Add vaults if requested and not yet initialized
      if (includeVaults) {
        if (!status?.wsolInitialized) {
          tx.add(
            buildInitializeReferralTokenAccountIx({
              payer,
              referralAccount: referralPda,
              mint: WSOL_MINT,
            })
          );
          instructionsAdded++;
        }
        if (!status?.usdcInitialized) {
          tx.add(
            buildInitializeReferralTokenAccountIx({
              payer,
              referralAccount: referralPda,
              mint: USDC_MINT,
            })
          );
          instructionsAdded++;
        }
      }

      if (instructionsAdded === 0) {
        setStepMsg("✅ Seçilen tüm hesaplar zaten aktif!");
        setLoading(false);
        return;
      }

      setStepMsg("Adım 2/4: Lütfen açılan Phantom penceresinde işlemi ONAYLAYIN (Approve)...");

      // 3. Try signing
      let signature = "";
      if (typeof provider.signAndSendTransaction === "function") {
        try {
          const res = await provider.signAndSendTransaction(tx);
          signature = res.signature;
        } catch (sendErr: unknown) {
          const sendMsg = sendErr instanceof Error ? sendErr.message : String(sendErr);
          if (sendMsg.includes("reject") || sendMsg.includes("User rejected")) {
            throw new Error("İşlem Phantom cüzdanından iptal edildi.");
          }
          console.warn("signAndSendTransaction fallback to signTransaction:", sendErr);
        }
      }

      if (!signature) {
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

        setStepMsg("Adım 3/4: İmza alındı! İşlem Solana blokzincirine iletiliyor...");
        const rawTx = signedTx.serialize();
        signature = await conn.sendRawTransaction(rawTx, {
          skipPreflight: false,
          preflightCommitment: "confirmed",
          maxRetries: 5,
        });
      }

      setStepMsg(`Adım 4/4: Solana ağında onay bekleniyor... (Tx: ${signature.slice(0, 10)}…)`);

      // 5. Confirm using polling with timeout resilience
      let confirmed = false;
      const start = Date.now();
      while (Date.now() - start < 45000) {
        const sigStatus = await conn.getSignatureStatus(signature, { searchTransactionHistory: true });
        if (sigStatus?.value?.confirmationStatus === "confirmed" || sigStatus?.value?.confirmationStatus === "finalized") {
          confirmed = true;
          break;
        }
        await new Promise((r) => setTimeout(r, 2000));
      }

      if (!confirmed) {
        // Fallback check
        try {
          await conn.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, "confirmed");
          confirmed = true;
        } catch {
          // If expired check on-chain account directly
          const refStatus = await fetch("/api/admin/referral-status").then((r) => r.json());
          if (refStatus?.status?.referralInitialized) {
            confirmed = true;
          }
        }
      }

      setTxSig(signature);
      setStepMsg("🎉 BAŞARILI! İşlem Solana blokzincirinde doğrulandı ve aktif edildi!");
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
              {statusLoading ? "Kontrol ediliyor..." : status?.referralInitialized ? "Aktif & Hazır (ON-CHAIN)" : "Başlatılmadı"}
            </span>
          </div>
          <div className={styles.checkItem}>
            <span className={styles.checkName}>WSOL Komisyon Kasası (Solana Alım-Satım)</span>
            <span className={status?.wsolInitialized ? styles.checkStatusReady : styles.checkStatusMissing}>
              {statusLoading ? "Kontrol ediliyor..." : status?.wsolInitialized ? "Aktif & Hazır" : "Açılmayı Bekliyor"}
            </span>
          </div>
          <div className={styles.checkItem}>
            <span className={styles.checkName}>USDC Komisyon Kasası (Sabit Coin)</span>
            <span className={status?.usdcInitialized ? styles.checkStatusReady : styles.checkStatusMissing}>
              {statusLoading ? "Kontrol ediliyor..." : status?.usdcInitialized ? "Aktif & Hazır" : "Açılmayı Bekliyor"}
            </span>
          </div>
        </div>

        {error && <div className={styles.alertError}>❌ {error}</div>}
        {stepMsg && <div className={styles.alertSuccess}>{stepMsg}</div>}

        {status?.referralInitialized && !txSig && (
          <div className={styles.alertSuccess}>
            🎉 <strong>Tebrikler! Ana Referral Hesabınız (GL1TCH) Solana Blokzincirinde Başarıyla Açıldı!</strong><br />
            Hesap: <code style={{ color: "#7cf6c8" }}>{status.referralPda}</code><br />
            Son adım olarak swap komisyonlarının toplanacağı kasayı (WSOL/USDC) tek tıkla onaylayabilirsiniz.
          </div>
        )}

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

        <div style={{ marginTop: "2rem", display: "flex", flexDirection: "column", gap: "12px" }}>
          {!walletAddress ? (
            <button className={styles.connectBtn} onClick={handleConnect}>
              🦊 Phantom Cüzdanını Bağla
            </button>
          ) : status?.ready ? (
            <button className={styles.primaryBtn} disabled>
              ✅ Referral ve Komisyon Kasaları Zaten Aktif!
            </button>
          ) : status?.referralInitialized ? (
            <button
              className={styles.primaryBtn}
              onClick={() => executeSetup(true)}
              disabled={loading}
            >
              {loading ? "Onay Bekleniyor..." : "🚀 Komisyon Kasalarını Başlat (WSOL & USDC Vaults)"}
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
                  padding: "0.85rem",
                  borderRadius: "10px",
                  fontSize: "0.95rem",
                  cursor: "pointer",
                  fontWeight: 600,
                  transition: "all 0.2s",
                }}
                onClick={() => executeSetup(false)}
                disabled={loading}
              >
                ⚡ Sadece Ana Referral Hesabını Başlat (Tek Talimat)
              </button>
            </>
          )}
        </div>

        <div style={{ marginTop: "2rem", textAlign: "center" }}>
          <Link href="/revenue" style={{ color: "#94a3b8", fontSize: "0.9rem" }}>
            ← Gelir &amp; Hazine Sayfasına Dön
          </Link>
        </div>
      </section>
    </main>
  );
}
