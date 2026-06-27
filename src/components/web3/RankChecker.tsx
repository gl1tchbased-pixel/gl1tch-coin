"use client";

import { useCallback, useEffect, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { CONTRACT_ADDRESS } from "@/lib/official";
import {
  RANK_TIERS,
  rankForBalance,
  nextTier,
  formatAmount,
  type RankTier,
} from "@/lib/ranks";
import { ConnectWallet } from "./ConnectWallet";
import { RankCard } from "@/components/ui/RankCard";
import styles from "./RankChecker.module.css";

export function RankChecker() {
  const { connection } = useConnection();
  const { publicKey, connected } = useWallet();
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const live = Boolean(CONTRACT_ADDRESS);

  const fetchBalance = useCallback(async () => {
    if (!publicKey || !live) return;
    setLoading(true);
    setError(null);
    try {
      const mint = new PublicKey(CONTRACT_ADDRESS);
      const res = await connection.getParsedTokenAccountsByOwner(publicKey, {
        mint,
      });
      let total = 0;
      for (const { account } of res.value) {
        const amt = account.data.parsed?.info?.tokenAmount?.uiAmount;
        if (typeof amt === "number") total += amt;
      }
      setBalance(total);
    } catch {
      setError("Could not read balance. Try again.");
    } finally {
      setLoading(false);
    }
  }, [publicKey, connection, live]);

  useEffect(() => {
    if (connected && live) fetchBalance();
    else setBalance(null);
  }, [connected, live, fetchBalance]);

  const current: RankTier = rankForBalance(balance ?? 0);
  const next = nextTier(current);

  return (
    <div className={styles.wrap}>
      <div className={styles.panel}>
        {!connected ? (
          <div className={styles.connect}>
            <p className={styles.lead}>
              Connect your Solana wallet to verify your rank in The Infected.
            </p>
            <ConnectWallet />
          </div>
        ) : !live ? (
          <div className={styles.connect}>
            <p className={styles.lead}>
              Wallet connected. Ranks activate at launch — once $GL1TCH is live,
              your holdings will resolve to a tier automatically.
            </p>
            <span className={styles.status}>Status: pre-launch preview</span>
          </div>
        ) : loading ? (
          <p className={styles.lead}>Reading the signal…</p>
        ) : error ? (
          <div className={styles.connect}>
            <p className={styles.lead}>{error}</p>
            <button className={styles.retry} onClick={fetchBalance}>
              Retry
            </button>
          </div>
        ) : (
          <div className={styles.result}>
            <span className={styles.rankLabel}>Your rank</span>
            <span className={styles.rankName}>{current.rank}</span>
            <span className={styles.balance}>
              {formatAmount(balance ?? 0)} $GL1TCH
            </span>
            {next ? (
              <span className={styles.next}>
                {formatAmount(next.min - (balance ?? 0))} more to reach{" "}
                <strong>{next.rank}</strong>
              </span>
            ) : (
              <span className={styles.next}>Top tier reached. Ghost Node.</span>
            )}
          </div>
        )}
      </div>

      <div className={styles.ladder}>
        {RANK_TIERS.map((t) => (
          <RankCard
            key={t.id}
            id={`ladder-${t.id}`}
            rank={t.rank}
            description={`${t.min === 0 ? "No holding required" : `${formatAmount(t.min)} $GL1TCH`}`}
            behavior={t.unlocks}
            tier={t.tier}
            className={current.id === t.id && connected && live ? styles.active : ""}
          />
        ))}
      </div>
    </div>
  );
}
